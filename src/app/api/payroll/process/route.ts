import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computePayroll } from "@/lib/payroll-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { entityId: string; year: number; month: number };
    const { entityId, year, month } = body;

    if (!entityId || !year || !month) {
      return NextResponse.json({ error: "entityId, year, month required" }, { status: 400 });
    }

    // Find or create PayrollRun
    let run = await db.payrollRun.findUnique({
      where: { entityId_year_month: { entityId, year, month } },
      include: { details: true },
    });

    if (run?.status === "LOCKED") {
      return NextResponse.json({ error: "Payroll is locked for this month" }, { status: 400 });
    }

    // STEP 0: If re-processing, REVERSE previous loan updates
    if (run?.status === "PROCESSED" && run.details.length > 0) {
      for (const detail of run.details) {
        if (detail.loanEmi > 0) {
          // Find EMPLOYEE_LOAN for this employee (active or closed)
          const loans = await db.loanAccount.findMany({
            where: { employeeId: detail.employeeId, loanType: "EMPLOYEE_LOAN" },
            orderBy: { createdAt: "asc" },
          });
          let remaining = detail.loanEmi;
          for (const loan of loans) {
            if (remaining <= 0) break;
            const reverseAmt = Math.min(remaining, loan.totalPaid);
            const newPaid = loan.totalPaid - reverseAmt;
            const newOutstanding = loan.principalAmount - newPaid;
            await db.loanAccount.update({
              where: { id: loan.id },
              data: {
                totalPaid: newPaid,
                outstandingBalance: newOutstanding,
                status: newOutstanding > 0 ? "ACTIVE" : "CLOSED",
              },
            });
            remaining -= reverseAmt;
          }
        }
        if (detail.cashLoanEmi > 0) {
          const loans = await db.loanAccount.findMany({
            where: { employeeId: detail.employeeId, loanType: "CASH_LOAN" },
            orderBy: { createdAt: "asc" },
          });
          let remaining = detail.cashLoanEmi;
          for (const loan of loans) {
            if (remaining <= 0) break;
            const reverseAmt = Math.min(remaining, loan.totalPaid);
            const newPaid = loan.totalPaid - reverseAmt;
            const newOutstanding = loan.principalAmount - newPaid;
            await db.loanAccount.update({
              where: { id: loan.id },
              data: {
                totalPaid: newPaid,
                outstandingBalance: newOutstanding,
                status: newOutstanding > 0 ? "ACTIVE" : "CLOSED",
              },
            });
            remaining -= reverseAmt;
          }
        }
      }
    }

    if (!run) {
      run = await db.payrollRun.create({
        data: { entityId, year, month, status: "DRAFT" },
        include: { details: true },
      });
    }

    // Get all active employees for this entity
    const employees = await db.employee.findMany({
      where: { entityId, status: { in: ["ACTIVE", "PROBATION"] } },
    });

    // Get the AttendanceMonth for this period
    const attendanceMonth = await db.attendanceMonth.findUnique({
      where: { year_month_entityId: { year, month, entityId } },
      include: { records: true },
    });

    const recordMap = new Map(
      (attendanceMonth?.records ?? []).map((r) => [r.employeeId, r])
    );

    // Get all advance entries for this entity + month + year
    const allAdvanceEntries = await db.advanceEntry.findMany({
      where: { employee: { entityId }, month, year },
    });

    // Get all active loan accounts for this entity's employees (fresh query after reversal)
    const allLoans = await db.loanAccount.findMany({
      where: { employee: { entityId }, status: "ACTIVE" },
    });

    // Process each employee
    for (const emp of employees) {
      const rec = recordMap.get(emp.id);

      const att = {
        payableDays: rec?.payableDays ? Number(rec.payableDays) : 0,
        workedDays: rec?.workedDays ? Number(rec.workedDays) : 0,
        otDays: rec?.otDays ? Number(rec.otDays) : 0,
        leaveEncashDays: 0,
        labourHoliday: 0,
      };

      const empInput = {
        salary: Number(emp.salary),
        ta: Number(emp.travelAllow),
        uanNumber: emp.uanNumber,
        esiNumber: emp.esiNumber,
      };

      const empEntries = allAdvanceEntries.filter((e) => e.employeeId === emp.id);
      const empLoans = allLoans.filter((l) => l.employeeId === emp.id);

      const advances = {
        bankAdvance: 0, cashAdvance: 0, jifyAdvance: 0,
        loanEmi: 0, cashLoanEmi: 0, uniformDeduction: 0,
      };

      for (const e of empEntries) {
        if (e.type === "BANK_ADVANCE") advances.bankAdvance += e.amount;
        else if (e.type === "CASH_ADVANCE") advances.cashAdvance += e.amount;
        else if (e.type === "JIFY_ADVANCE") advances.jifyAdvance += e.amount;
        else if (e.type === "LOAN_EMI") advances.loanEmi += e.amount;
        else if (e.type === "CASH_LOAN_EMI") advances.cashLoanEmi += e.amount;
      }

      for (const loan of empLoans) {
        if (loan.loanType === "EMPLOYEE_LOAN") advances.loanEmi += loan.emiAmount;
        else if (loan.loanType === "CASH_LOAN") advances.cashLoanEmi += loan.emiAmount;
      }

      const result = computePayroll(empInput, att, 0, advances);

      await db.payrollDetail.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: emp.id } },
        update: {
          payableDays: att.payableDays, workedDays: att.workedDays, otDays: att.otDays,
          leaveEncashDays: att.leaveEncashDays, labourHoliday: att.labourHoliday,
          salary: empInput.salary,
          basic: result.basic, hra: result.hra, specialAllowance: result.specialAllowance,
          bonus: result.bonus, ta: result.ta, lec: result.lec, perDaySalary: result.perDaySalary,
          earnedBasic: result.earnedBasic, earnedHra: result.earnedHra,
          earnedSpecial: result.earnedSpecial, earnedOt: result.earnedOt,
          earnedLeave: result.earnedLeave, earnedLabour: result.earnedLabour, earnedTa: result.earnedTa,
          salaryArrears: 0, grossSalary: result.grossSalary,
          pfEmployee: result.pfEmployee, pfEmployer: result.pfEmployer,
          esiEmployee: result.esiEmployee, esiEmployer: result.esiEmployer,
          professionalTax: result.professionalTax,
          bankAdvance: result.bankAdvance, cashAdvance: result.cashAdvance,
          jifyAdvance: result.jifyAdvance, loanEmi: result.loanEmi,
          cashLoanEmi: result.cashLoanEmi, uniformDeduction: result.uniformDeduction,
          totalDeductions: result.totalDeductions, netSalary: result.netSalary,
          gratuity: result.gratuity, ctc: result.ctc,
        },
        create: {
          payrollRunId: run.id, employeeId: emp.id,
          payableDays: att.payableDays, workedDays: att.workedDays, otDays: att.otDays,
          leaveEncashDays: att.leaveEncashDays, labourHoliday: att.labourHoliday,
          salary: empInput.salary,
          basic: result.basic, hra: result.hra, specialAllowance: result.specialAllowance,
          bonus: result.bonus, ta: result.ta, lec: result.lec, perDaySalary: result.perDaySalary,
          earnedBasic: result.earnedBasic, earnedHra: result.earnedHra,
          earnedSpecial: result.earnedSpecial, earnedOt: result.earnedOt,
          earnedLeave: result.earnedLeave, earnedLabour: result.earnedLabour, earnedTa: result.earnedTa,
          salaryArrears: 0, grossSalary: result.grossSalary,
          pfEmployee: result.pfEmployee, pfEmployer: result.pfEmployer,
          esiEmployee: result.esiEmployee, esiEmployer: result.esiEmployer,
          professionalTax: result.professionalTax,
          bankAdvance: result.bankAdvance, cashAdvance: result.cashAdvance,
          jifyAdvance: result.jifyAdvance, loanEmi: result.loanEmi,
          cashLoanEmi: result.cashLoanEmi, uniformDeduction: result.uniformDeduction,
          totalDeductions: result.totalDeductions, netSalary: result.netSalary,
          gratuity: result.gratuity, ctc: result.ctc,
        },
      });
    }

    // Aggregate totals
    const details = await db.payrollDetail.findMany({ where: { payrollRunId: run.id } });
    const totalGross = details.reduce((s, d) => s + d.grossSalary, 0);
    const totalDeductions = details.reduce((s, d) => s + d.totalDeductions, 0);
    const totalNet = details.reduce((s, d) => s + d.netSalary, 0);

    const updatedRun = await db.payrollRun.update({
      where: { id: run.id },
      data: { status: "PROCESSED", processedAt: new Date(), totalGross, totalDeductions, totalNet, employeeCount: details.length },
      include: { details: { include: { employee: { include: { department: true } } } } },
    });

    // STEP FINAL: Update loan balances based on deducted EMIs
    for (const detail of details) {
      if (detail.loanEmi > 0) {
        const loans = await db.loanAccount.findMany({
          where: { employeeId: detail.employeeId, loanType: "EMPLOYEE_LOAN", status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });
        let remaining = detail.loanEmi;
        for (const loan of loans) {
          if (remaining <= 0) break;
          const payAmt = Math.min(remaining, loan.outstandingBalance);
          const newPaid = loan.totalPaid + payAmt;
          const newOutstanding = Math.max(0, loan.outstandingBalance - payAmt);
          await db.loanAccount.update({
            where: { id: loan.id },
            data: {
              totalPaid: newPaid,
              outstandingBalance: newOutstanding,
              status: newOutstanding <= 0 ? "CLOSED" : "ACTIVE",
            },
          });
          remaining -= payAmt;
        }
      }
      if (detail.cashLoanEmi > 0) {
        const loans = await db.loanAccount.findMany({
          where: { employeeId: detail.employeeId, loanType: "CASH_LOAN", status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });
        let remaining = detail.cashLoanEmi;
        for (const loan of loans) {
          if (remaining <= 0) break;
          const payAmt = Math.min(remaining, loan.outstandingBalance);
          const newPaid = loan.totalPaid + payAmt;
          const newOutstanding = Math.max(0, loan.outstandingBalance - payAmt);
          await db.loanAccount.update({
            where: { id: loan.id },
            data: {
              totalPaid: newPaid,
              outstandingBalance: newOutstanding,
              status: newOutstanding <= 0 ? "CLOSED" : "ACTIVE",
            },
          });
          remaining -= payAmt;
        }
      }
    }

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error("payroll/process error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
