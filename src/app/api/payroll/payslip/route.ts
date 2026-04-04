import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generatePayslipPdf,
  MONTHS,
  type PayrollDetailWithEmployee,
} from "@/lib/generate-payslip-pdf";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const detailId = searchParams.get("detailId");

    if (!detailId) {
      return NextResponse.json({ error: "detailId required" }, { status: 400 });
    }

    const detail = await db.payrollDetail.findUnique({
      where: { id: detailId },
      include: {
        payrollRun: {
          include: { entity: { select: { name: true } } },
        },
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
    });

    if (!detail) {
      return NextResponse.json({ error: "Payroll detail not found" }, { status: 404 });
    }

    const run = detail.payrollRun;
    const entityName = run.entity.name;
    const month = MONTHS[run.month - 1];
    const year = run.year;

    const typedDetail: PayrollDetailWithEmployee = {
      id: detail.id,
      payableDays: detail.payableDays,
      workedDays: detail.workedDays,
      otDays: detail.otDays,
      leaveEncashDays: detail.leaveEncashDays,
      labourHoliday: detail.labourHoliday,
      salary: detail.salary,
      earnedBasic: detail.earnedBasic,
      earnedHra: detail.earnedHra,
      earnedSpecial: detail.earnedSpecial,
      earnedOt: detail.earnedOt,
      earnedLeave: detail.earnedLeave,
      earnedLabour: detail.earnedLabour,
      earnedTa: detail.earnedTa,
      salaryArrears: detail.salaryArrears,
      grossSalary: detail.grossSalary,
      pfEmployee: detail.pfEmployee,
      pfEmployer: detail.pfEmployer,
      esiEmployee: detail.esiEmployee,
      esiEmployer: detail.esiEmployer,
      professionalTax: detail.professionalTax,
      tds: detail.tds,
      uniformDeduction: detail.uniformDeduction,
      bankAdvance: detail.bankAdvance,
      cashAdvance: detail.cashAdvance,
      jifyAdvance: detail.jifyAdvance,
      loanEmi: detail.loanEmi,
      cashLoanEmi: detail.cashLoanEmi,
      totalDeductions: detail.totalDeductions,
      netSalary: detail.netSalary,
      gratuity: detail.gratuity,
      ctc: detail.ctc,
      employee: detail.employee,
    };

    const pdfBuffer = await generatePayslipPdf(typedDetail, entityName, month, year);

    const filename = `Payslip_${detail.employee.employeeCode}_${month}_${year}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("payslip GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
