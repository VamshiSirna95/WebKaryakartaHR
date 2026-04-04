import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  // Find MGBT entity
  const entity = await db.entity.findFirst({ where: { code: "MGBT" } });
  if (!entity) throw new Error("MGBT entity not found");

  // Find employees
  const [e003, e006, e007] = await Promise.all([
    db.employee.findFirst({ where: { entityId: entity.id, employeeCode: "E003" } }),
    db.employee.findFirst({ where: { entityId: entity.id, employeeCode: "E006" } }),
    db.employee.findFirst({ where: { entityId: entity.id, employeeCode: "E007" } }),
  ]);

  if (!e003) throw new Error("E003 not found");
  if (!e006) throw new Error("E006 not found");
  if (!e007) throw new Error("E007 not found");

  console.log("Seeding loan accounts...");

  // E003: Employee Loan ₹36,000 @ ₹3,000/mo, 12 months, started Dec 2025
  // 3 EMIs paid (Dec, Jan, Feb) = ₹9,000 paid, ₹27,000 outstanding, ACTIVE
  await db.loanAccount.upsert({
    where: {
      id: "seed-loan-e003-emp",
    },
    update: {
      principalAmount: 36000,
      emiAmount: 3000,
      tenure: 12,
      startMonth: 12,
      startYear: 2025,
      totalPaid: 9000,
      outstandingBalance: 27000,
      status: "ACTIVE",
      remarks: "Medical emergency",
    },
    create: {
      id: "seed-loan-e003-emp",
      employeeId: e003.id,
      loanType: "EMPLOYEE_LOAN",
      principalAmount: 36000,
      emiAmount: 3000,
      tenure: 12,
      startMonth: 12,
      startYear: 2025,
      totalPaid: 9000,
      outstandingBalance: 27000,
      status: "ACTIVE",
      remarks: "Medical emergency",
    },
  });
  console.log("  E003 Employee Loan: ₹36,000 (paid ₹9,000, outstanding ₹27,000) ACTIVE");

  // E006: Cash Loan ₹12,000 @ ₹2,000/mo, 6 months, started Jan 2026
  // 2 EMIs paid (Jan, Feb) = ₹4,000 paid, ₹8,000 outstanding, ACTIVE
  await db.loanAccount.upsert({
    where: {
      id: "seed-loan-e006-cash",
    },
    update: {
      principalAmount: 12000,
      emiAmount: 2000,
      tenure: 6,
      startMonth: 1,
      startYear: 2026,
      totalPaid: 4000,
      outstandingBalance: 8000,
      status: "ACTIVE",
      remarks: "Personal expense",
    },
    create: {
      id: "seed-loan-e006-cash",
      employeeId: e006.id,
      loanType: "CASH_LOAN",
      principalAmount: 12000,
      emiAmount: 2000,
      tenure: 6,
      startMonth: 1,
      startYear: 2026,
      totalPaid: 4000,
      outstandingBalance: 8000,
      status: "ACTIVE",
      remarks: "Personal expense",
    },
  });
  console.log("  E006 Cash Loan: ₹12,000 (paid ₹4,000, outstanding ₹8,000) ACTIVE");

  // E007: Employee Loan ₹6,000 @ ₹2,000/mo, 3 months, started Jan 2026
  // All 3 EMIs paid = ₹6,000 paid, ₹0 outstanding, CLOSED
  await db.loanAccount.upsert({
    where: {
      id: "seed-loan-e007-emp",
    },
    update: {
      principalAmount: 6000,
      emiAmount: 2000,
      tenure: 3,
      startMonth: 1,
      startYear: 2026,
      totalPaid: 6000,
      outstandingBalance: 0,
      status: "CLOSED",
      remarks: "Fully repaid",
    },
    create: {
      id: "seed-loan-e007-emp",
      employeeId: e007.id,
      loanType: "EMPLOYEE_LOAN",
      principalAmount: 6000,
      emiAmount: 2000,
      tenure: 3,
      startMonth: 1,
      startYear: 2026,
      totalPaid: 6000,
      outstandingBalance: 0,
      status: "CLOSED",
      remarks: "Fully repaid",
    },
  });
  console.log("  E007 Employee Loan: ₹6,000 (paid ₹6,000, outstanding ₹0) CLOSED");

  console.log("\nDone! Loan accounts seeded successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
