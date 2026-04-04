import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LEAVE_TYPES = [
  { code: "CL", name: "Casual Leave", annualQuota: 12, carryForwardMax: 0, maxConsecutiveDays: 3, isPaid: true, applicableGender: null },
  { code: "SL", name: "Sick Leave", annualQuota: 6, carryForwardMax: 0, maxConsecutiveDays: 5, isPaid: true, applicableGender: null },
  { code: "EL", name: "Earned Leave", annualQuota: 15, carryForwardMax: 5, maxConsecutiveDays: null, isPaid: true, applicableGender: null },
  { code: "PL", name: "Privilege Leave", annualQuota: 1, carryForwardMax: 0, maxConsecutiveDays: 1, isPaid: true, applicableGender: null },
  { code: "ML", name: "Maternity Leave", annualQuota: 182, carryForwardMax: 0, maxConsecutiveDays: null, isPaid: true, applicableGender: "Female" },
  { code: "PTL", name: "Paternity Leave", annualQuota: 15, carryForwardMax: 0, maxConsecutiveDays: null, isPaid: true, applicableGender: "Male" },
  { code: "LOP", name: "Loss of Pay", annualQuota: 0, carryForwardMax: 0, maxConsecutiveDays: null, isPaid: false, applicableGender: null },
];

async function main() {
  console.log("Seeding leave data…");

  // Get both entities
  const entities = await db.entity.findMany({ select: { id: true, code: true } });
  if (entities.length === 0) throw new Error("No entities found. Run seed.ts first.");

  const leaveTypeMap: Record<string, Record<string, string>> = {}; // entityId -> code -> leaveTypeId

  for (const entity of entities) {
    console.log(`  Setting up leave types for ${entity.code}…`);
    leaveTypeMap[entity.id] = {};

    for (const lt of LEAVE_TYPES) {
      const created = await db.leaveType.upsert({
        where: { entityId_code: { entityId: entity.id, code: lt.code } },
        create: {
          entityId: entity.id,
          code: lt.code,
          name: lt.name,
          annualQuota: lt.annualQuota,
          carryForwardMax: lt.carryForwardMax,
          maxConsecutiveDays: lt.maxConsecutiveDays,
          isPaid: lt.isPaid,
          applicableGender: lt.applicableGender,
          requiresApproval: true,
          isActive: true,
        },
        update: {
          name: lt.name,
          annualQuota: lt.annualQuota,
          carryForwardMax: lt.carryForwardMax,
          maxConsecutiveDays: lt.maxConsecutiveDays,
          isPaid: lt.isPaid,
          applicableGender: lt.applicableGender,
        },
      });
      leaveTypeMap[entity.id][lt.code] = created.id;
      console.log(`    v ${lt.code}: ${lt.name}`);
    }
  }

  // Seed balances for FY 2026 for all active employees
  console.log("  Seeding leave balances for FY 2026…");
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, employeeCode: true, entityId: true, gender: true },
    orderBy: { employeeCode: "asc" },
  });

  const BALANCE_CODES = ["CL", "SL", "EL", "PL"];

  for (const emp of employees) {
    const typeMap = leaveTypeMap[emp.entityId];
    if (!typeMap) continue;

    for (const code of BALANCE_CODES) {
      const leaveTypeId = typeMap[code];
      if (!leaveTypeId) continue;

      let opening = 0, credited = 0, used = 0;
      if (code === "CL") { credited = 12; used = rand(0, 4); }
      else if (code === "SL") { credited = 6; used = rand(0, 2); }
      else if (code === "EL") { credited = 15; opening = rand(0, 3); used = rand(0, 3); }
      else if (code === "PL") { credited = 1; used = rand(0, 1); }

      const balance = opening + credited - used;

      await db.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId, year: 2026 } },
        create: { employeeId: emp.id, leaveTypeId, year: 2026, opening, credited, used, balance },
        update: { opening, credited, used, balance },
      });
    }
    console.log(`    v ${emp.employeeCode}`);
  }

  // Seed sample leave requests for first entity
  console.log("  Seeding sample leave requests…");
  const firstEntity = entities[0];
  const entityEmployees = employees.filter((e) => e.entityId === firstEntity.id);
  if (entityEmployees.length === 0) { console.log("  No employees for first entity, skipping requests"); return; }

  const typeMap = leaveTypeMap[firstEntity.id];

  const requests = [
    // 3 PENDING
    { empIdx: 0, code: "CL", from: "2026-04-07", to: "2026-04-08", days: 2, reason: "Personal work", status: "PENDING" },
    { empIdx: 1, code: "SL", from: "2026-04-10", to: "2026-04-10", days: 1, reason: "Fever", status: "PENDING" },
    { empIdx: 2, code: "EL", from: "2026-04-14", to: "2026-04-16", days: 3, reason: "Family function", status: "PENDING" },
    // 3 APPROVED
    { empIdx: 3, code: "CL", from: "2026-04-01", to: "2026-04-01", days: 1, reason: "Doctor appointment", status: "APPROVED", approvedBy: "HR Admin" },
    { empIdx: 4, code: "SL", from: "2026-04-02", to: "2026-04-03", days: 2, reason: "Illness", status: "APPROVED", approvedBy: "HR Admin" },
    { empIdx: 0, code: "EL", from: "2026-04-04", to: "2026-04-04", days: 0.5, reason: "Personal work", status: "APPROVED", approvedBy: "HR Admin", isHalfDay: true, halfDayType: "FIRST_HALF" },
    // 2 REJECTED
    { empIdx: 5, code: "CL", from: "2026-04-15", to: "2026-04-18", days: 4, reason: "Vacation", status: "REJECTED", rejectionReason: "Business critical period" },
    { empIdx: 6, code: "EL", from: "2026-04-20", to: "2026-04-22", days: 3, reason: "Travel", status: "REJECTED", rejectionReason: "Insufficient notice" },
    // 1 CANCELLED
    { empIdx: 2, code: "CL", from: "2026-04-25", to: "2026-04-25", days: 1, reason: "Cancelled plans", status: "CANCELLED" },
  ];

  for (const r of requests) {
    const emp = entityEmployees[r.empIdx % entityEmployees.length];
    const leaveTypeId = typeMap[r.code];
    if (!leaveTypeId || !emp) continue;

    await db.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId,
        entityId: firstEntity.id,
        fromDate: new Date(r.from),
        toDate: new Date(r.to),
        days: r.days,
        reason: r.reason,
        status: r.status,
        approvedBy: "approvedBy" in r ? r.approvedBy ?? null : null,
        approvedAt: r.status === "APPROVED" ? new Date("2026-04-01") : null,
        rejectionReason: "rejectionReason" in r ? r.rejectionReason ?? null : null,
        isHalfDay: "isHalfDay" in r ? r.isHalfDay ?? false : false,
        halfDayType: "halfDayType" in r ? r.halfDayType ?? null : null,
      },
    });
    console.log(`    v ${emp.employeeCode} ${r.code} ${r.from} — ${r.status}`);
  }

  console.log("Leave data seeded successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
