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
    });

    if (run?.status === "LOCKED") {
      return NextResponse.json({ error: "Payroll is locked for this month" }, { status: 400 });
    }

    if (!run) {
      run = await db.payrollRun.create({
        data: { entityId, year, month, status: "DRAFT" },
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

      const result = computePayroll(empInput, att, 0);

      await db.payrollDetail.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: emp.id } },
        update: {
          payableDays: att.payableDays,
          workedDays: att.workedDays,
          otDays: att.otDays,
          leaveEncashDays: att.leaveEncashDays,
          labourHoliday: att.labourHoliday,
          salary: empInput.salary,
          basic: result.basic,
          hra: result.hra,
          specialAllowance: result.specialAllowance,
          bonus: result.bonus,
          ta: result.ta,
          lec: result.lec,
          perDaySalary: result.perDaySalary,
          earnedBasic: result.earnedBasic,
          earnedHra: result.earnedHra,
          earnedSpecial: result.earnedSpecial,
          earnedOt: result.earnedOt,
          earnedLeave: result.earnedLeave,
          earnedLabour: result.earnedLabour,
          earnedTa: result.earnedTa,
          salaryArrears: 0,
          grossSalary: result.grossSalary,
          pfEmployee: result.pfEmployee,
          pfEmployer: result.pfEmployer,
          esiEmployee: result.esiEmployee,
          esiEmployer: result.esiEmployer,
          professionalTax: result.professionalTax,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          gratuity: result.gratuity,
          ctc: result.ctc,
        },
        create: {
          payrollRunId: run.id,
          employeeId: emp.id,
          payableDays: att.payableDays,
          workedDays: att.workedDays,
          otDays: att.otDays,
          leaveEncashDays: att.leaveEncashDays,
          labourHoliday: att.labourHoliday,
          salary: empInput.salary,
          basic: result.basic,
          hra: result.hra,
          specialAllowance: result.specialAllowance,
          bonus: result.bonus,
          ta: result.ta,
          lec: result.lec,
          perDaySalary: result.perDaySalary,
          earnedBasic: result.earnedBasic,
          earnedHra: result.earnedHra,
          earnedSpecial: result.earnedSpecial,
          earnedOt: result.earnedOt,
          earnedLeave: result.earnedLeave,
          earnedLabour: result.earnedLabour,
          earnedTa: result.earnedTa,
          salaryArrears: 0,
          grossSalary: result.grossSalary,
          pfEmployee: result.pfEmployee,
          pfEmployer: result.pfEmployer,
          esiEmployee: result.esiEmployee,
          esiEmployer: result.esiEmployer,
          professionalTax: result.professionalTax,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          gratuity: result.gratuity,
          ctc: result.ctc,
        },
      });
    }

    // Aggregate totals
    const details = await db.payrollDetail.findMany({
      where: { payrollRunId: run.id },
    });

    const totalGross = details.reduce((s, d) => s + d.grossSalary, 0);
    const totalDeductions = details.reduce((s, d) => s + d.totalDeductions, 0);
    const totalNet = details.reduce((s, d) => s + d.netSalary, 0);

    const updatedRun = await db.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: details.length,
      },
      include: { details: { include: { employee: { include: { department: true } } } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error("payroll/process error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
