import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface EmployeeSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  bankAdvance: number;
  cashAdvance: number;
  jifyAdvance: number;
  loanEmi: number;
  cashLoanEmi: number;
  totalDeductions: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId || !month || !year) {
      return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Get all advance entries for the month
    const entries = await db.advanceEntry.findMany({
      where: { employee: { entityId }, month: m, year: y },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Get all active loan accounts for this entity's employees
    const loans = await db.loanAccount.findMany({
      where: { employee: { entityId }, status: "ACTIVE" },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const summaryMap = new Map<string, EmployeeSummary>();

    // Process manual advance entries
    for (const e of entries) {
      const empId = e.employee.id;
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employeeId: empId,
          employeeCode: e.employee.employeeCode,
          employeeName: e.employee.fullName,
          departmentName: e.employee.department?.name ?? "",
          bankAdvance: 0, cashAdvance: 0, jifyAdvance: 0,
          loanEmi: 0, cashLoanEmi: 0, totalDeductions: 0,
        });
      }
      const s = summaryMap.get(empId)!;
      if (e.type === "BANK_ADVANCE") s.bankAdvance += e.amount;
      else if (e.type === "CASH_ADVANCE") s.cashAdvance += e.amount;
      else if (e.type === "JIFY_ADVANCE") s.jifyAdvance += e.amount;
      else if (e.type === "LOAN_EMI") s.loanEmi += e.amount;
      else if (e.type === "CASH_LOAN_EMI") s.cashLoanEmi += e.amount;
    }

    // Auto-pull active loan EMIs
    for (const loan of loans) {
      const empId = loan.employee.id;
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employeeId: empId,
          employeeCode: loan.employee.employeeCode,
          employeeName: loan.employee.fullName,
          departmentName: loan.employee.department?.name ?? "",
          bankAdvance: 0, cashAdvance: 0, jifyAdvance: 0,
          loanEmi: 0, cashLoanEmi: 0, totalDeductions: 0,
        });
      }
      const s = summaryMap.get(empId)!;
      if (loan.loanType === "EMPLOYEE_LOAN") s.loanEmi += loan.emiAmount;
      else if (loan.loanType === "CASH_LOAN") s.cashLoanEmi += loan.emiAmount;
    }

    // Compute totals
    const result = Array.from(summaryMap.values()).map((s) => ({
      ...s,
      totalDeductions: s.bankAdvance + s.cashAdvance + s.jifyAdvance + s.loanEmi + s.cashLoanEmi,
    }));

    result.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

    return NextResponse.json(result);
  } catch (error) {
    console.error("advances/summary GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
