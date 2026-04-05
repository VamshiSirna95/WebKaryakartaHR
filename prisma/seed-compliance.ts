import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const TYPES = ["PF", "ESI", "PT"];

// Due day: PT = 21st, PF/ESI = 15th of following month
function dueDate(type: string, month: number, year: number): Date {
  const dueDay = type === "PT" ? 21 : 15;
  const dueMonth = month === 12 ? 1 : month + 1;
  const dueYear = month === 12 ? year + 1 : year;
  return new Date(dueYear, dueMonth - 1, dueDay);
}

// Reference numbers
function refNo(type: string, month: number, year: number, entityCode: string): string {
  const mm = String(month).padStart(2, "0");
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `${type}/${entityCode}/${year}${mm}/${suffix}`;
}

// Amounts (approximate monthly statutory)
function amount(type: string): number {
  if (type === "PF") return Math.floor(18000 + Math.random() * 4000);
  if (type === "ESI") return Math.floor(3500 + Math.random() * 1500);
  return Math.floor(2000 + Math.random() * 1000); // PT
}

async function main() {
  const entities = await db.entity.findMany({ select: { id: true, code: true } });
  if (entities.length === 0) {
    console.error("No entities found. Run seed.ts first.");
    process.exit(1);
  }

  // FY 2026-27: months Jan 2026 (1), Feb 2026 (2), Mar 2026 (3) = FILED; Apr 2026 (4) = PENDING
  const filedMonths = [1, 2, 3];
  const pendingMonths = [4];

  for (const entity of entities) {
    console.log(`Seeding compliance filings for ${entity.code}...`);

    for (const type of TYPES) {
      // FILED months
      for (const month of filedMonths) {
        const year = 2026;
        const due = dueDate(type, month, year);
        const filedAt = new Date(due.getTime() - Math.floor(Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
        await db.complianceFiling.upsert({
          where: { entityId_type_month_year: { entityId: entity.id, type, month, year } },
          create: {
            entityId: entity.id,
            type,
            month,
            year,
            dueDate: due,
            status: "FILED",
            filedAt,
            filedBy: "HR Admin",
            referenceNo: refNo(type, month, year, entity.code),
            amount: amount(type),
            remarks: null,
          },
          update: {
            status: "FILED",
            filedAt,
            filedBy: "HR Admin",
            referenceNo: refNo(type, month, year, entity.code),
            amount: amount(type),
          },
        });
      }

      // PENDING months
      for (const month of pendingMonths) {
        const year = 2026;
        const due = dueDate(type, month, year);
        await db.complianceFiling.upsert({
          where: { entityId_type_month_year: { entityId: entity.id, type, month, year } },
          create: {
            entityId: entity.id,
            type,
            month,
            year,
            dueDate: due,
            status: "PENDING",
            filedAt: null,
            filedBy: null,
            referenceNo: null,
            amount: null,
            remarks: null,
          },
          update: {
            status: "PENDING",
            filedAt: null,
            filedBy: null,
          },
        });
      }
    }
  }

  console.log("Done seeding compliance filings.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
