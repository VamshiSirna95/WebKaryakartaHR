import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateBankNeftFile } from "@/lib/generate-bank-file";
import { MONTHS, type PayrollDetailWithEmployee } from "@/lib/generate-payslip-pdf";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    if (!entityId || !monthParam || !yearParam) {
      return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    const run = await db.payrollRun.findUnique({
      where: { entityId_year_month: { entityId, year, month } },
      include: {
        entity: { select: { name: true } },
        details: {
          include: {
            employee: {
              select: {
                employeeCode: true,
                fullName: true,
                dateOfJoining: true,
                bankAccountNo: true,
                bankName: true,
                bankIfsc: true,
                bankBranch: true,
                department: { select: { name: true } },
                designation: { select: { name: true } },
                location: { select: { code: true, name: true } },
              },
            },
          },
          orderBy: { employee: { employeeCode: "asc" } },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 400 });
    }

    if (run.status === "DRAFT") {
      return NextResponse.json({ error: "Payroll must be PROCESSED or LOCKED to generate bank file" }, { status: 400 });
    }

    const entityName = run.entity.name;
    const monthName = MONTHS[month - 1];

    const typedDetails: PayrollDetailWithEmployee[] = run.details.map((d) => ({
      id: d.id,
      payableDays: d.payableDays,
      workedDays: d.workedDays,
      otDays: d.otDays,
      leaveEncashDays: d.leaveEncashDays,
      labourHoliday: d.labourHoliday,
      salary: d.salary,
      earnedBasic: d.earnedBasic,
      earnedHra: d.earnedHra,
      earnedSpecial: d.earnedSpecial,
      earnedOt: d.earnedOt,
      earnedLeave: d.earnedLeave,
      earnedLabour: d.earnedLabour,
      earnedTa: d.earnedTa,
      salaryArrears: d.salaryArrears,
      grossSalary: d.grossSalary,
      pfEmployee: d.pfEmployee,
      pfEmployer: d.pfEmployer,
      esiEmployee: d.esiEmployee,
      esiEmployer: d.esiEmployer,
      professionalTax: d.professionalTax,
      tds: d.tds,
      uniformDeduction: d.uniformDeduction,
      bankAdvance: d.bankAdvance,
      cashAdvance: d.cashAdvance,
      jifyAdvance: d.jifyAdvance,
      loanEmi: d.loanEmi,
      cashLoanEmi: d.cashLoanEmi,
      totalDeductions: d.totalDeductions,
      netSalary: d.netSalary,
      gratuity: d.gratuity,
      ctc: d.ctc,
      employee: d.employee,
    }));

    const csvBuffer = generateBankNeftFile(typedDetails, entityName, monthName, year);

    const safeEntity = entityName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeEntity}_NEFT_${monthName}_${year}.csv`;

    return new NextResponse(new Uint8Array(csvBuffer), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(csvBuffer.length),
      },
    });
  } catch (error) {
    console.error("bank-file GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
