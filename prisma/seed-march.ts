import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { computePayroll } from "../src/lib/payroll-engine";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const YEAR = 2026;
const MONTH = 3; // March
const DAYS_IN_MARCH = 31;
const MARCH_SUNDAYS = new Set([1, 8, 15, 22, 29]);
const HOLI_DAY = 14; // March 14

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function computeLeaveEncash(workedDays: number): number {
  if (workedDays >= 26) return 3;
  if (workedDays >= 22) return 2;
  if (workedDays >= 21) return 1;
  return 0;
}

async function seedEntityMarch(entityId: string, entityCode: string) {
  // Upsert AttendanceMonth for March 2026
  const attendanceMonth = await prisma.attendanceMonth.upsert({
    where: { year_month_entityId: { year: YEAR, month: MONTH, entityId } },
    update: {},
    create: { year: YEAR, month: MONTH, entityId, status: "OPEN" },
  });

  // Add Holi holiday (shared, no entityId)
  await prisma.holiday.upsert({
    where: { date_entityId: { date: new Date(`${YEAR}-03-14`), entityId: null as unknown as string } },
    update: { name: "Holi" },
    create: { date: new Date(`${YEAR}-03-14`), name: "Holi" },
  }).catch(() => {
    // ignore unique constraint errors from other seeds
  });

  const employees = await prisma.employee.findMany({
    where: { entityId, status: { in: ["ACTIVE", "PROBATION"] } },
    include: { designation: true },
  });

  // Employees who get 1-2 absent days (pick ~2-3)
  const absenteeIndices = new Set<number>();
  if (employees.length > 4) {
    absenteeIndices.add(2);
    absenteeIndices.add(5);
    absenteeIndices.add(7 % employees.length);
  }
  // Employee who gets an HD (pick 1)
  const hdIndex = 3 % employees.length;
  // Absent days for absentees
  const absentDays = new Set([10, 17]);

  const attendanceResults: { employeeId: string; workedDays: number; payableDays: number; otDays: number; leaveEncashDays: number }[] = [];

  for (let idx = 0; idx < employees.length; idx++) {
    const emp = employees[idx];
    const isManagerOrSupervisor =
      emp.designation.name.toLowerCase().includes("manager") ||
      emp.designation.name.toLowerCase().includes("supervisor");

    const dayData: Record<string, string | null> = {};
    let workedDays = 0;
    let weekOffs = 0;

    for (let d = 1; d <= DAYS_IN_MARCH; d++) {
      let status: string;

      if (MARCH_SUNDAYS.has(d)) {
        status = "WO";
        weekOffs++;
      } else if (d === HOLI_DAY) {
        status = "PH";
        workedDays += 1;
      } else if (!isManagerOrSupervisor && absenteeIndices.has(idx) && absentDays.has(d)) {
        status = "A";
      } else if (!isManagerOrSupervisor && idx === hdIndex && d === 20) {
        status = "HD";
        workedDays += 0.5;
      } else {
        status = "P";
        workedDays += 1;
      }

      dayData[`day${d}`] = status;
    }

    const total = workedDays + weekOffs;
    const otDays = Math.max(0, total - DAYS_IN_MARCH);
    const payableDays = total - otDays;
    const leaveEncashDays = computeLeaveEncash(workedDays);

    await prisma.attendanceRecord.upsert({
      where: { attendanceMonthId_employeeId: { attendanceMonthId: attendanceMonth.id, employeeId: emp.id } },
      update: { ...dayData, workedDays, weekOffs, otDays, payableDays },
      create: { attendanceMonthId: attendanceMonth.id, employeeId: emp.id, ...dayData, workedDays, weekOffs, otDays, payableDays },
    });

    attendanceResults.push({ employeeId: emp.id, workedDays, payableDays, otDays, leaveEncashDays });
  }

  // Process payroll for March 2026
  await prisma.payrollDetail.deleteMany({
    where: { payrollRun: { entityId, year: YEAR, month: MONTH } },
  });
  await prisma.payrollRun.deleteMany({ where: { entityId, year: YEAR, month: MONTH } });

  const payrollRun = await prisma.payrollRun.create({
    data: { entityId, year: YEAR, month: MONTH, status: "PROCESSED", processedAt: new Date() },
  });

  let totalGross = 0, totalDeductions = 0, totalNet = 0;

  for (const emp of employees) {
    const attData = attendanceResults.find((a) => a.employeeId === emp.id)!;
    const attInput = {
      payableDays: attData.payableDays,
      workedDays: attData.workedDays,
      otDays: attData.otDays,
      leaveEncashDays: attData.leaveEncashDays,
      labourHoliday: 0,
    };
    const empInput = {
      salary: Number(emp.salary),
      ta: Number(emp.travelAllow),
      uanNumber: emp.uanNumber,
      esiNumber: emp.esiNumber,
    };
    const result = computePayroll(empInput, attInput, 0);

    await prisma.payrollDetail.create({
      data: {
        payrollRunId: payrollRun.id,
        employeeId: emp.id,
        payableDays: attInput.payableDays,
        workedDays: attInput.workedDays,
        otDays: attInput.otDays,
        leaveEncashDays: attInput.leaveEncashDays,
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
    where: { id: payrollRun.id },
    data: { totalGross, totalDeductions, totalNet, employeeCount: employees.length },
  });

  console.log(`  ${entityCode}: ${employees.length} employees, gross=${Math.round(totalGross).toLocaleString("en-IN")}, net=${Math.round(totalNet).toLocaleString("en-IN")}`);
}

async function reprocessApril(entityId: string) {
  const APRIL = 4;
  const existingRun = await prisma.payrollRun.findUnique({
    where: { entityId_year_month: { entityId, year: YEAR, month: APRIL } },
  });
  if (!existingRun) return;

  const employees = await prisma.employee.findMany({
    where: { entityId, status: { in: ["ACTIVE", "PROBATION"] } },
  });
  const attendanceMonth = await prisma.attendanceMonth.findUnique({
    where: { year_month_entityId: { year: YEAR, month: APRIL, entityId } },
    include: { records: true },
  });
  const recordMap = new Map((attendanceMonth?.records ?? []).map((r) => [r.employeeId, r]));

  await prisma.payrollDetail.deleteMany({ where: { payrollRunId: existingRun.id } });

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
    const result = computePayroll(empInput, attInput, 0);

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
    data: { totalGross, totalDeductions, totalNet, employeeCount: employees.length, processedAt: new Date() },
  });
}

async function main() {
  console.log("Seeding March 2026 attendance + payroll...");

  // Step 1: Update ALL employees with UAN and ESI numbers
  const allEmployees = await prisma.employee.findMany();
  for (const emp of allEmployees) {
    if (!emp.uanNumber || emp.uanNumber.length < 12) {
      const uan = "1014" + randomDigits(8);
      const esi = "3600" + randomDigits(8);
      await prisma.employee.update({
        where: { id: emp.id },
        data: { uanNumber: uan, uanStatus: "GENERATED", esiNumber: esi, esiStatus: "GENERATED" },
      });
    }
  }
  console.log(`Updated UAN/ESI for ${allEmployees.length} employees`);

  // Step 2: Get entities
  const mgbt = await prisma.entity.findUnique({ where: { code: "MGBT" } });
  const kmf = await prisma.entity.findUnique({ where: { code: "KMF" } });

  if (!mgbt || !kmf) {
    console.error("Entities not found. Run main seed first.");
    process.exit(1);
  }

  // Step 3: Seed March attendance + payroll for both entities
  console.log("March 2026 payroll:");
  await seedEntityMarch(mgbt.id, "MGBT");
  await seedEntityMarch(kmf.id, "KMF");

  // Step 4: Re-process April 2026 with updated UAN/ESI
  console.log("Re-processing April 2026 with updated UAN/ESI...");
  await reprocessApril(mgbt.id);
  await reprocessApril(kmf.id);
  console.log("  Done.");

  console.log("\nSeed complete! March 2026 payroll is ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
