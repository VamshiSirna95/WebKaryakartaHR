import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// New regime slabs FY 2026-27
function taxNewRegime(income: number): number {
  if (income <= 400000) return 0;
  if (income <= 800000) return (income - 400000) * 0.05;
  if (income <= 1200000) return 20000 + (income - 800000) * 0.10;
  if (income <= 1600000) return 60000 + (income - 1200000) * 0.15;
  if (income <= 2000000) return 120000 + (income - 1600000) * 0.20;
  if (income <= 2400000) return 200000 + (income - 2000000) * 0.25;
  return 300000 + (income - 2400000) * 0.30;
}

// Old regime slabs FY 2026-27
function taxOldRegime(income: number): number {
  if (income <= 250000) return 0;
  if (income <= 500000) return (income - 250000) * 0.05;
  if (income <= 1000000) return 12500 + (income - 500000) * 0.20;
  return 112500 + (income - 1000000) * 0.30;
}

function addCess(tax: number): number {
  return Math.round(tax * 1.04);
}

function buildFyMonths(fyStart: number): { month: number; year: number }[] {
  return [
    ...Array.from({ length: 9 }, (_, i) => ({ month: i + 4, year: fyStart })),
    ...Array.from({ length: 3 }, (_, i) => ({ month: i + 1, year: fyStart + 1 })),
  ];
}

// Parse FY string "2026-27" → start year 2026
function parseFy(fy: string): number {
  return parseInt(fy.split("-")[0]);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const fy = searchParams.get("fy");

  if (!employeeId || !fy) {
    return NextResponse.json({ error: "employeeId and fy required" }, { status: 400 });
  }

  const fyStart = parseFy(fy);
  const fyMos = buildFyMonths(fyStart);
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const monthsRemaining = fyMos.filter(
    (fm) => fm.year > curYear || (fm.year === curYear && fm.month >= curMonth)
  ).length;

  const [employee, declaration, fyPayrollDetails] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      select: {
        salary: true,
        basic: true,
        hra: true,
        entity: { select: { id: true } },
      },
    }),
    db.investmentDeclaration.findUnique({
      where: { employeeId_financialYear: { employeeId, financialYear: fy } },
    }),
    db.payrollDetail.findMany({
      where: {
        employeeId,
        payrollRun: {
          OR: fyMos.map((fm) => ({ year: fm.year, month: fm.month })),
        },
      },
      select: { professionalTax: true, tds: true },
    }),
  ]);

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const salary = Number(employee.salary);
  const basic = Number(employee.basic) || Math.round(salary * 0.70);
  const hra = Number(employee.hra) || Math.round(salary * 0.20);

  const annualGross = salary * 12;
  const standardDeduction = 75000;
  const professionalTax = fyPayrollDetails.reduce((s, d) => s + d.professionalTax, 0);
  const tdsPaidYtd = fyPayrollDetails.reduce((s, d) => s + d.tds, 0);

  const regime = declaration?.regime ?? "NEW";
  const total80C = declaration?.total80C ?? 0;
  const sec80D = (declaration?.sec80D_self ?? 0) + (declaration?.sec80D_parents ?? 0);
  const sec24 = declaration?.sec24_homeLoanInterest ?? 0;
  const otherDeductions = (declaration?.sec80E_eduLoan ?? 0) +
    (declaration?.sec80G_donation ?? 0) +
    (declaration?.nps_80CCD ?? 0);

  // HRA exemption (only for old regime)
  let hraExemption = 0;
  if (regime === "OLD" && declaration && declaration.hraRentPaid > 0) {
    const annualRent = declaration.hraRentPaid * 12;
    const annualBasic = basic * 12;
    const annualHra = hra * 12;
    const metroFraction = declaration.hraMetro ? 0.50 : 0.40;
    const a = annualHra;
    const b = annualRent - annualBasic * 0.10;
    const c = annualBasic * metroFraction;
    hraExemption = Math.max(0, Math.min(a, b, c));
  }

  // Taxable income
  let taxableIncome: number;
  let totalExemptions: number;

  if (regime === "OLD") {
    totalExemptions = standardDeduction + professionalTax + total80C + sec80D + sec24 + otherDeductions + hraExemption;
    taxableIncome = Math.max(0, annualGross - totalExemptions);
  } else {
    // New regime: only standard deduction + PT apply (no 80C/80D etc, except NPS employer which we skip)
    totalExemptions = standardDeduction + professionalTax;
    taxableIncome = Math.max(0, annualGross - totalExemptions);
  }

  let rawTaxOld = taxOldRegime(taxableIncome);
  if (regime === "OLD" && taxableIncome <= 500000) rawTaxOld = 0; // 87A rebate
  const taxOldRegimeAmt = addCess(rawTaxOld);

  let rawTaxNew = taxNewRegime(taxableIncome);
  if (regime === "NEW" && taxableIncome <= 1200000) rawTaxNew = 0; // 87A rebate
  const taxNewRegimeAmt = addCess(rawTaxNew);

  const applicableTax = regime === "OLD" ? taxOldRegimeAmt : taxNewRegimeAmt;
  const monthlyTds = Math.round(applicableTax / 12);
  const tdsRemaining = Math.max(0, applicableTax - tdsPaidYtd);

  return NextResponse.json({
    annualGross,
    standardDeduction,
    professionalTax,
    sec80C: total80C,
    sec80D,
    sec24,
    otherDeductions,
    hraExemption,
    totalExemptions,
    taxableIncome,
    taxOldRegime: taxOldRegimeAmt,
    taxNewRegime: taxNewRegimeAmt,
    selectedRegime: regime,
    applicableTax,
    monthlyTds,
    tdsPaidYtd,
    tdsRemaining,
    monthsRemaining,
  });
}
