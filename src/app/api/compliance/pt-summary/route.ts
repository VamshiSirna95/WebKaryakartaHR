import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId || !month || !year) {
      return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
    }

    const run = await db.payrollRun.findUnique({
      where: { entityId_year_month: { entityId, year: parseInt(year), month: parseInt(month) } },
      include: {
        entity: { select: { code: true } },
        details: {
          select: { grossSalary: true, professionalTax: true },
        },
      },
    });

    if (!run) return NextResponse.json({ error: "PayrollRun not found" }, { status: 404 });

    const slab1 = { slab: "≥₹20,001", employees: 0, totalPT: 0 };
    const slab2 = { slab: "₹15,001–₹20,000", employees: 0, totalPT: 0 };
    const slab3 = { slab: "Below ₹15,001", employees: 0, totalPT: 0 };

    for (const d of run.details) {
      const gross = d.grossSalary;
      const pt = d.professionalTax;
      if (gross >= 20001) { slab1.employees++; slab1.totalPT += pt; }
      else if (gross >= 15001) { slab2.employees++; slab2.totalPT += pt; }
      else { slab3.employees++; slab3.totalPT += pt; }
    }

    const grandTotal = slab1.totalPT + slab2.totalPT + slab3.totalPT;

    return NextResponse.json({
      entity: run.entity.code,
      month: MONTHS[parseInt(month) - 1],
      year: parseInt(year),
      slabs: [slab1, slab2, slab3],
      grandTotal,
    });
  } catch (error) {
    console.error("pt-summary error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
