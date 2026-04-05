import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const FY = "2026-27";

function computeTotals(d: {
  sec80C_ppf: number; sec80C_elss: number; sec80C_lic: number; sec80C_nsc: number;
  sec80C_tuition: number; sec80C_homeLoan: number; sec80C_fd: number; sec80C_sukanya: number; sec80C_other: number;
  sec80D_self: number; sec80D_parents: number; sec24_homeLoanInterest: number;
  sec80E_eduLoan: number; sec80G_donation: number; nps_80CCD: number;
}) {
  const raw80C = d.sec80C_ppf + d.sec80C_elss + d.sec80C_lic + d.sec80C_nsc +
    d.sec80C_tuition + d.sec80C_homeLoan + d.sec80C_fd + d.sec80C_sukanya + d.sec80C_other;
  const total80C = Math.min(raw80C, 150000);
  const totalDeductions = total80C + d.sec80D_self + d.sec80D_parents +
    d.sec24_homeLoanInterest + d.sec80E_eduLoan + d.sec80G_donation + d.nps_80CCD;
  return { total80C, totalDeductions };
}

// TDS filing records to add (Jan-Mar FILED, Apr PENDING)
async function seedTdsFilings(entities: { id: string; code: string }[]) {
  const now = new Date();
  const filedMonths = [1, 2, 3];
  const pendingMonths = [4];

  for (const entity of entities) {
    for (const month of filedMonths) {
      const year = 2026;
      // TDS due: 7th of following month
      const dueM = month === 12 ? 1 : month + 1;
      const dueY = month === 12 ? year + 1 : year;
      const dueDate = new Date(dueY, dueM - 1, 7);
      const filedAt = new Date(dueDate.getTime() - (Math.floor(Math.random() * 3) + 1) * 24 * 60 * 60 * 1000);
      const mm = String(month).padStart(2, "0");
      await db.complianceFiling.upsert({
        where: { entityId_type_month_year: { entityId: entity.id, type: "TDS", month, year } },
        create: {
          entityId: entity.id, type: "TDS", month, year,
          dueDate, status: "FILED", filedAt,
          filedBy: "HR Admin",
          referenceNo: `TDS/${entity.code}/${year}${mm}/${Math.floor(100000 + Math.random() * 900000)}`,
          amount: Math.floor(8000 + Math.random() * 5000),
        },
        update: { status: "FILED", filedAt },
      });
    }
    for (const month of pendingMonths) {
      const year = 2026;
      const dueM = month === 12 ? 1 : month + 1;
      const dueY = month === 12 ? year + 1 : year;
      const dueDate = new Date(dueY, dueM - 1, 7);
      await db.complianceFiling.upsert({
        where: { entityId_type_month_year: { entityId: entity.id, type: "TDS", month, year } },
        create: { entityId: entity.id, type: "TDS", month, year, dueDate, status: "PENDING" },
        update: { status: "PENDING" },
      });
    }
  }
  console.log("TDS filings seeded.");
}

async function main() {
  const entities = await db.entity.findMany({ select: { id: true, code: true } });
  if (entities.length === 0) { console.error("No entities found."); process.exit(1); }

  // Seed TDS filings
  await seedTdsFilings(entities);

  // Find employees by code across all entities
  const codes = ["E001", "E002", "E003", "E006", "E014"];
  const employees = await db.employee.findMany({
    where: { employeeCode: { in: codes } },
    select: { id: true, employeeCode: true, entityId: true },
  });

  if (employees.length === 0) {
    console.log("No matching employees found (E001-E014). Skipping declaration seed.");
    await db.$disconnect();
    return;
  }

  const empMap = new Map(employees.map((e) => [e.employeeCode, e]));

  const declarations = [
    {
      code: "E001",
      regime: "OLD",
      data: {
        sec80C_ppf: 50000, sec80C_elss: 0, sec80C_lic: 24000, sec80C_nsc: 0,
        sec80C_tuition: 0, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
        sec80D_self: 15000, sec80D_parents: 0,
        sec24_homeLoanInterest: 120000,
        sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 0,
        hraRentPaid: 0, hraMetro: false,
      },
    },
    {
      code: "E002",
      regime: "NEW",
      data: {
        sec80C_ppf: 0, sec80C_elss: 30000, sec80C_lic: 0, sec80C_nsc: 0,
        sec80C_tuition: 0, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
        sec80D_self: 0, sec80D_parents: 0,
        sec24_homeLoanInterest: 0,
        sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 50000,
        hraRentPaid: 0, hraMetro: false,
      },
    },
    {
      code: "E003",
      regime: "OLD",
      data: {
        sec80C_ppf: 100000, sec80C_elss: 50000, sec80C_lic: 0, sec80C_nsc: 0,
        sec80C_tuition: 40000, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
        sec80D_self: 0, sec80D_parents: 0,
        sec24_homeLoanInterest: 0,
        sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 0,
        hraRentPaid: 0, hraMetro: false,
      },
    },
    {
      code: "E006",
      regime: "NEW",
      data: {
        sec80C_ppf: 0, sec80C_elss: 0, sec80C_lic: 0, sec80C_nsc: 0,
        sec80C_tuition: 0, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
        sec80D_self: 0, sec80D_parents: 0,
        sec24_homeLoanInterest: 0,
        sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 0,
        hraRentPaid: 0, hraMetro: false,
      },
    },
    {
      code: "E014",
      regime: "OLD",
      data: {
        sec80C_ppf: 0, sec80C_elss: 0, sec80C_lic: 36000, sec80C_nsc: 0,
        sec80C_tuition: 0, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
        sec80D_self: 25000, sec80D_parents: 25000,
        sec24_homeLoanInterest: 0,
        sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 0,
        hraRentPaid: 8000, hraMetro: false,
      },
    },
  ];

  for (const decl of declarations) {
    const emp = empMap.get(decl.code);
    if (!emp) { console.log(`Employee ${decl.code} not found, skipping.`); continue; }
    const { total80C, totalDeductions } = computeTotals(decl.data);
    await db.investmentDeclaration.upsert({
      where: { employeeId_financialYear: { employeeId: emp.id, financialYear: FY } },
      create: {
        employeeId: emp.id,
        entityId: emp.entityId,
        financialYear: FY,
        regime: decl.regime,
        ...decl.data,
        total80C,
        totalDeductions,
        status: "DECLARED",
      },
      update: {
        regime: decl.regime,
        ...decl.data,
        total80C,
        totalDeductions,
      },
    });
    console.log(`Seeded declaration for ${decl.code}`);
  }

  console.log("Done seeding declarations.");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
