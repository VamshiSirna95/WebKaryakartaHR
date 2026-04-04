import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { computePayroll } from "../src/lib/payroll-engine";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const YEAR = 2026;
  const MONTH = 3; // March

  console.log("Seeding advance and loan data for March 2026...");

  // Find MGBT entity
  const mgbt = await prisma.entity.findUnique({ where: { code: "MGBT" } });
  if (!mgbt) {
    console.error("MGBT entity not found. Run main seed first.");
    process.exit(1);
  }

  // Find specific employees by code
  const e001 = await prisma.employee.findUnique({ where: { employeeCode: "E001" } });
  const e002 = await prisma.employee.findUnique({ where: { employeeCode: "E002" } });
  const e005 = await prisma.employee.findUnique({ where: { employeeCode: "E005" } });

  if (!e001 || !e002 || !e005) {
    console.error("Employees E001/E002/E005 not found.");
    process.exit(1);
  }

  // Clear existing advance entries for March 2026 for these employees
  await prisma.advanceEntry.deleteMany({
    where: {
      employeeId: { in: [e001.id, e002.id, e005.id] },
      month: MONTH,
      year: YEAR,
    },
  });

  // Clear existing loan accounts for these employees
  await prisma.loanAccount.deleteMany({
    where: { employeeId: { in: [e001.id, e002.id] } },
  });

  console.log("Creating advance entries...");

  // E001: Bank Advance ₹5,000
  await prisma.advanceEntry.create({
    data: {
      employeeId: e001.id,
      type: "BANK_ADVANCE",
      amount: 5000,
      month: MONTH,
      year: YEAR,
      remarks: "Personal emergency",
    },
  });

  // E002: Cash Advance ₹3,000 + Jify Advance ₹2,000
  await prisma.advanceEntry.create({
    data: {
      employeeId: e002.id,
      type: "CASH_ADVANCE",
      amount: 3000,
      month: MONTH,
      year: YEAR,
      remarks: "Medical",
    },
  });
  await prisma.advanceEntry.create({
    data: {
      employeeId: e002.id,
      type: "JIFY_ADVANCE",
      amount: 2000,
      month: MONTH,
      year: YEAR,
      remarks: "Jify wallet advance",
    },
  });

  // E005: Bank Advance ₹10,000 + Cash Advance ₹5,000
  await prisma.advanceEntry.create({
    data: {
      employeeId: e005.id,
      type: "BANK_ADVANCE",
      amount: 10000,
      month: MONTH,
      year: YEAR,
      remarks: "Vehicle repair",
    },
  });
  await prisma.advanceEntry.create({
    data: {
      employeeId: e005.id,
      type: "CASH_ADVANCE",
      amount: 5000,
      month: MONTH,
      year: YEAR,
      remarks: "House rent",
    },
  });

  console.log("Creating loan accounts...");

  // E001: Employee Loan ₹24,000, EMI ₹2,000, started Jan 2026 (2 months paid)
  await prisma.loanAccount.create({
    data: {
      employeeId: e001.id,
      loanType: "EMPLOYEE_LOAN",
      principalAmount: 24000,
      emiAmount: 2000,
      tenure: 12,
      startMonth: 1,
      startYear: 2026,
      totalPaid: 4000,
      outstandingBalance: 20000,
      status: "ACTIVE",
      remarks: "Festival loan",
    },
  });

  // E002: Cash Loan ₹18,000, EMI ₹1,500, started Feb 2026 (1 month paid)
  await prisma.loanAccount.create({
    data: {
      employeeId: e002.id,
      loanType: "CASH_LOAN",
      principalAmount: 18000,
      emiAmount: 1500,
      tenure: 12,
      startMonth: 2,
      startYear: 2026,
      totalPaid: 1500,
      outstandingBalance: 16500,
      status: "ACTIVE",
      remarks: "Cash loan",
    },
  });

  console.log("Re-processing March 2026 payroll for MGBT with advance deductions...");

  // Get the March 2026 payroll run for MGBT
  const existingRun = await prisma.payrollRun.findUnique({
    where: { entityId_year_month: { entityId: mgbt.id, year: YEAR, month: MONTH } },
  });

  if (!existingRun) {
    console.error("March 2026 payroll run not found. Run seed-march.ts first.");
    process.exit(1);
  }

  if (existingRun.status === "LOCKED") {
    console.error("March 2026 payroll is LOCKED — cannot reprocess.");
    process.exit(1);
  }

  // Delete existing details and reprocess
  await prisma.payrollDetail.deleteMany({ where: { payrollRunId: existingRun.id } });

  const employees = await prisma.employee.findMany({
    where: { entityId: mgbt.id, status: { in: ["ACTIVE", "PROBATION"] } },
  });

  const attendanceMonth = await prisma.attendanceMonth.findUnique({
    where: { year_month_entityId: { year: YEAR, month: MONTH, entityId: mgbt.id } },
    include: { records: true },
  });
  const recordMap = new Map((attendanceMonth?.records ?? []).map((r) => [r.employeeId, r]));

  // Fetch all advance entries for MGBT March 2026
  const allEntries = await prisma.advanceEntry.findMany({
    where: { employee: { entityId: mgbt.id }, month: MONTH, year: YEAR },
  });

  // Fetch all active loans for MGBT employees
  const allLoans = await prisma.loanAccount.findMany({
    where: { employee: { entityId: mgbt.id }, status: "ACTIVE" },
  });

  let totalGross = 0, totalDeductions = 0, totalNet = 0;

  for (const emp of employees) {
    const rec = recordMap.get(emp.id);
    const attInput = {
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

    const empEntries = allEntries.filter((e) => e.employeeId === emp.id);
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

    const result = computePayroll(empInput, attInput, 0, advances);

    await prisma.payrollDetail.create({
      data: {
        payrollRunId: existingRun.id,
        employeeId: emp.id,
        payableDays: attInput.payableDays,
        workedDays: attInput.workedDays,
        otDays: attInput.otDays,
        leaveEncashDays: 0,
        labourHoliday: 0,
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
        bankAdvance: result.bankAdvance,
        cashAdvance: result.cashAdvance,
        jifyAdvance: result.jifyAdvance,
        loanEmi: result.loanEmi,
        cashLoanEmi: result.cashLoanEmi,
        uniformDeduction: result.uniformDeduction,
        totalDeductions: result.totalDeductions,
        netSalary: result.netSalary,
        gratuity: result.gratuity,
        ctc: result.ctc,
      },
    });

    totalGross += result.grossSalary;
    totalDeductions += result.totalDeductions;
    totalNet += result.netSalary;
  }

  await prisma.payrollRun.update({
    where: { id: existingRun.id },
    data: {
      totalGross,
      totalDeductions,
      totalNet,
      employeeCount: employees.length,
      processedAt: new Date(),
    },
  });

  console.log(`\nDone! March 2026 payroll re-processed.`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Total Gross: \u20B9${Math.round(totalGross).toLocaleString("en-IN")}`);
  console.log(`  Total Deductions: \u20B9${Math.round(totalDeductions).toLocaleString("en-IN")}`);
  console.log(`  Total Net: \u20B9${Math.round(totalNet).toLocaleString("en-IN")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
