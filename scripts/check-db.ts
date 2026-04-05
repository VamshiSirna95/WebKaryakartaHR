import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connStr =
    process.env.DATABASE_URL ??
    "postgresql://postgres:Dada%404141@localhost:5432/karyakarta";
  const pool = new pg.Pool({ connectionString: connStr });
  const adapter = new PrismaPg(pool);
  const p = new PrismaClient({ adapter });

  try {
    const deps = await p.department.findMany();
    console.log(
      "DEPARTMENTS:",
      JSON.stringify(
        deps.map((d) => ({ id: d.id, name: d.name })),
        null,
        2
      )
    );

    const emps = await p.employee.findMany({
      include: {
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { employeeCode: "asc" },
    });
    console.log("\nEMPLOYEES:");
    emps.forEach((e) =>
      console.log(
        `  ${e.employeeCode}  ${e.fullName.padEnd(28)} dept: ${
          e.department?.name ?? "—"
        }  loc: ${e.location?.name ?? "—"}  status: ${e.status}`
      )
    );

    const sales = await p.salesRecord.findMany();
    console.log(`\nSALES RECORDS: ${sales.length}`);
    if (sales.length > 0) {
      sales.slice(0, 10).forEach((s) =>
        console.log(
          `  employee: ${s.employeeId.slice(-8)}  sales: ₹${s.totalSales.toLocaleString(
            "en-IN"
          )}  ratio: ${s.salaryRatio.toFixed(1)}%  status: ${s.status}`
        )
      );
    }

    const thresholds = await p.performanceThreshold.findMany({
      include: { department: { select: { name: true } } },
    });
    console.log(`\nTHRESHOLDS: ${thresholds.length}`);
    thresholds.forEach((t) =>
      console.log(
        `  dept: ${t.department?.name ?? "default"}  good<${t.goodBelow}%  improve<${t.improveBelow}%`
      )
    );

    const salesEmps = emps.filter((e) =>
      e.department?.name?.toLowerCase().includes("sales")
    );
    console.log(
      `\nSALES DEPT EMPLOYEES: ${salesEmps.length} (${salesEmps.map((e) => e.employeeCode).join(", ")})`
    );
  } finally {
    await p.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
