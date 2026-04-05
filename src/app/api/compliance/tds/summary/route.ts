import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// FY: April year → March year+1
function buildFyMonths(year: number): { month: number; year: number }[] {
  return [
    ...Array.from({ length: 9 }, (_, i) => ({ month: i + 4, year })),
    ...Array.from({ length: 3 }, (_, i) => ({ month: i + 1, year: year + 1 })),
  ];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const year = parseInt(searchParams.get("year") ?? "");

  if (!entityId || isNaN(year)) {
    return NextResponse.json({ error: "entityId and year required" }, { status: 400 });
  }

  const fyMos = buildFyMonths(year);

  const [runs, tdsFilings] = await Promise.all([
    db.payrollRun.findMany({
      where: {
        entityId,
        OR: fyMos.map((fm) => ({ year: fm.year, month: fm.month })),
      },
      include: {
        details: { select: { employeeId: true, tds: true } },
      },
    }),
    db.complianceFiling.findMany({
      where: {
        entityId,
        type: "TDS",
        OR: fyMos.map((fm) => ({ year: fm.year, month: fm.month })),
      },
    }),
  ]);

  const now = new Date();

  const months = fyMos.map((fm) => {
    const run = runs.find((r) => r.month === fm.month && r.year === fm.year);
    const filing = tdsFilings.find((f) => f.month === fm.month && f.year === fm.year);
    const totalTds = run ? run.details.reduce((s, d) => s + d.tds, 0) : 0;
    const employeeCount = run ? new Set(run.details.map((d) => d.employeeId)).size : 0;

    let challanStatus: string | null = null;
    if (filing) {
      challanStatus = filing.status;
    } else if (run) {
      // Due: 7th of following month
      const dueM = fm.month === 12 ? 1 : fm.month + 1;
      const dueY = fm.month === 12 ? fm.year + 1 : fm.year;
      const due = new Date(dueY, dueM - 1, 7);
      challanStatus = due < now ? "OVERDUE" : "PENDING";
    }

    return {
      month: fm.month,
      monthName: MONTHS[fm.month - 1],
      year: fm.year,
      totalTds,
      employeeCount,
      challanStatus,
    };
  });

  const fyTotal = months.reduce((s, m) => s + m.totalTds, 0);
  const fyEmployeeCount = Math.max(0, ...months.map((m) => m.employeeCount));

  return NextResponse.json({ months, fyTotal, fyEmployeeCount });
}
