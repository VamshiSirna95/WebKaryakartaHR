import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const MONTH = 3;
const YEAR = 2026;
const GOOD_BELOW = 6.0;
const IMPROVE_BELOW = 8.0;

function computeStatus(salaryRatio: number): string {
  if (salaryRatio < GOOD_BELOW) return "GOOD";
  if (salaryRatio < IMPROVE_BELOW) return "IMPROVE";
  return "POOR";
}

async function main() {
  // Find MGBT entity
  const entity = await db.entity.findFirst({ where: { code: "MGBT" } });
  if (!entity) { console.error("MGBT entity not found."); process.exit(1); }

  console.log(`Seeding performance data for ${entity.code}...`);

  // Seed default threshold
  await db.performanceThreshold.upsert({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { entityId_departmentId: { entityId: entity.id, departmentId: null as any } },
    create: { entityId: entity.id, departmentId: null, goodBelow: GOOD_BELOW, improveBelow: IMPROVE_BELOW },
    update: { goodBelow: GOOD_BELOW, improveBelow: IMPROVE_BELOW },
  });
  console.log("Default threshold seeded: GOOD<6%, IMPROVE<8%");

  // Find Sales department
  const salesDept = await db.department.findFirst({ where: { name: { contains: "Sales" } } });
  if (!salesDept) {
    console.warn("No 'Sales' department found. Creating sales records for all employees instead.");
  }

  // Find employees in Sales department (or all active if no Sales dept)
  const employees = await db.employee.findMany({
    where: {
      entityId: entity.id,
      status: "ACTIVE",
      ...(salesDept ? { departmentId: salesDept.id } : {}),
    },
    select: { id: true, employeeCode: true, fullName: true, departmentId: true },
    orderBy: { employeeCode: "asc" },
    take: 10,
  });

  if (employees.length === 0) {
    console.warn("No employees found for seeding.");
    await db.$disconnect();
    return;
  }

  // Fetch payroll data for Mar 2026
  const payrollRun = await db.payrollRun.findFirst({
    where: { entityId: entity.id, month: MONTH, year: YEAR },
    include: { details: { select: { employeeId: true, grossSalary: true } } },
  });

  const attendanceMonth = await db.attendanceMonth.findFirst({
    where: { entityId: entity.id, month: MONTH, year: YEAR },
    include: { records: { select: { employeeId: true, payableDays: true } } },
  });

  const payMap = new Map<string, number>(
    (payrollRun?.details ?? []).map((d) => [d.employeeId, d.grossSalary])
  );
  const attMap = new Map<string, number>(
    (attendanceMonth?.records ?? []).map((r) => [r.employeeId, Number(r.payableDays ?? 26)])
  );

  // Realistic textile retail sales distribution
  const salesDistribution: number[] = [];
  const n = employees.length;

  // Top ~25%: GOOD (ratio ~3-5%)
  const topCount = Math.max(1, Math.round(n * 0.25));
  // Middle ~50%: IMPROVE (ratio ~6-7.5%)
  const midCount = Math.max(1, Math.round(n * 0.50));
  // Bottom: POOR (ratio ~9-12%)
  const bottomCount = n - topCount - midCount;

  for (let i = 0; i < n; i++) {
    if (i < topCount) {
      salesDistribution.push(350000 + Math.floor(Math.random() * 150000)); // 3.5L - 5L
    } else if (i < topCount + midCount) {
      salesDistribution.push(180000 + Math.floor(Math.random() * 70000));  // 1.8L - 2.5L
    } else {
      salesDistribution.push(100000 + Math.floor(Math.random() * 50000));  // 1L - 1.5L
    }
  }

  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const totalSales = salesDistribution[i];
    const workedDays = attMap.get(emp.id) ?? 26;
    const grossSalary = payMap.get(emp.id) ?? 0;

    if (grossSalary === 0) {
      // Use a synthetic gross salary based on typical range if payroll not processed
      const syntheticGross = 15000 + Math.floor(Math.random() * 10000);
      const perDayAvg = totalSales / workedDays;
      const salaryRatio = (syntheticGross / totalSales) * 100;
      const status = computeStatus(salaryRatio);

      await db.salesRecord.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month: MONTH, year: YEAR } },
        create: {
          employeeId: emp.id, entityId: entity.id,
          month: MONTH, year: YEAR,
          totalSales, workedDays, grossSalary: syntheticGross,
          perDayAvg, salaryRatio, status,
        },
        update: { totalSales, workedDays, grossSalary: syntheticGross, perDayAvg, salaryRatio, status },
      });
      console.log(`  ${emp.employeeCode}: ₹${totalSales.toLocaleString("en-IN")} sales, ratio ${salaryRatio.toFixed(1)}% → ${status} (synthetic salary)`);
      saved++;
      continue;
    }

    const perDayAvg = totalSales / workedDays;
    const salaryRatio = (grossSalary / totalSales) * 100;
    const status = computeStatus(salaryRatio);

    await db.salesRecord.upsert({
      where: { employeeId_month_year: { employeeId: emp.id, month: MONTH, year: YEAR } },
      create: { employeeId: emp.id, entityId: entity.id, month: MONTH, year: YEAR, totalSales, workedDays, grossSalary, perDayAvg, salaryRatio, status },
      update: { totalSales, workedDays, grossSalary, perDayAvg, salaryRatio, status },
    });
    console.log(`  ${emp.employeeCode}: ₹${totalSales.toLocaleString("en-IN")} sales, ratio ${salaryRatio.toFixed(1)}% → ${status}`);
    saved++;
  }

  console.log(`\nDone: ${saved} saved, ${skipped} skipped (${bottomCount} POOR, ${midCount} IMPROVE, ${topCount} GOOD targets).`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
