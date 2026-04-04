import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const YEAR = 2026;
const MONTH = 4; // April
// April 2026 Sundays: 5, 12, 19, 26
const SUNDAYS = new Set([5, 12, 19, 26]);
const HOLIDAY_DAY = 14; // April 14 — Ambedkar Jayanti
const TODAY_DAY = 4;    // April 4, 2026 — seed data up to and including today

const RANDOM_STATUSES = ["P", "P", "P", "P", "P", "P", "P", "P", "A", "HD", "SL", "CL"];
// ~8/12 P, 1/12 A, 1/12 HD, 1/12 SL, 1/12 CL

function pickStatus(day: number): string | null {
  if (day > TODAY_DAY) return null;
  if (SUNDAYS.has(day)) return "WO";
  if (day === HOLIDAY_DAY) return "PH";
  return RANDOM_STATUSES[Math.floor(Math.random() * RANDOM_STATUSES.length)];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

async function main() {
  const daysInMonth = getDaysInMonth(YEAR, MONTH);

  // Find MGBT entity
  const mgbt = await prisma.entity.findUnique({ where: { code: "MGBT" } });
  if (!mgbt) {
    console.error("MGBT entity not found. Run main seed first.");
    process.exit(1);
  }

  // Create Holiday (upsert via deleteMany + create)
  await prisma.holiday.deleteMany({ where: { date: new Date(`${YEAR}-04-14`) } });
  await prisma.holiday.create({
    data: { date: new Date(`${YEAR}-04-14`), name: "Ambedkar Jayanti" },
  });

  // Find or create AttendanceMonth
  const attendanceMonth = await prisma.attendanceMonth.upsert({
    where: { year_month_entityId: { year: YEAR, month: MONTH, entityId: mgbt.id } },
    update: {},
    create: { year: YEAR, month: MONTH, entityId: mgbt.id, status: "OPEN" },
  });

  // Find all employees for MGBT
  const employees = await prisma.employee.findMany({
    where: { entityId: mgbt.id },
  });

  let seeded = 0;
  for (const emp of employees) {
    const dayData: Record<string, string | null> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayData[`day${d}`] = pickStatus(d);
    }

    await prisma.attendanceRecord.upsert({
      where: {
        attendanceMonthId_employeeId: {
          attendanceMonthId: attendanceMonth.id,
          employeeId: emp.id,
        },
      },
      update: dayData,
      create: {
        attendanceMonthId: attendanceMonth.id,
        employeeId: emp.id,
        ...dayData,
      },
    });
    seeded++;
  }

  console.log(`Seeded attendance for ${seeded} employees — April ${YEAR}`);
  console.log(`AttendanceMonth ID: ${attendanceMonth.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
