import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// FY: month >= 4 → fyStart = year; month < 4 → fyStart = year - 1
function fyMonths(month: number, year: number): { month: number; year: number }[] {
  const fyStart = month >= 4 ? year : year - 1;
  const result: { month: number; year: number }[] = [];
  // April fyStart → March fyStart+1, stopping at current month/year
  for (let m = 4; ; ) {
    const y = m >= 4 ? fyStart : fyStart + 1;
    result.push({ month: m, year: y });
    if (m === month && y === year) break;
    m++;
    if (m > 12) m = 1;
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (!entityId || isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
  }

  const run = await db.payrollRun.findUnique({
    where: { entityId_year_month: { entityId, year, month } },
    include: {
      details: {
        include: {
          employee: {
            select: { employeeCode: true, fullName: true, panNumber: true },
          },
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ runStatus: null, details: [], totals: { grossSalary: 0, tds: 0, ytdTds: 0 } });
  }

  // YTD: sum TDS for all months in this FY up to and including current month
  const fyMos = fyMonths(month, year);
  const ytdRows = await db.payrollDetail.findMany({
    where: {
      payrollRun: {
        entityId,
        OR: fyMos.map((fm) => ({ year: fm.year, month: fm.month })),
      },
    },
    select: { employeeId: true, tds: true },
  });

  const ytdMap = new Map<string, number>();
  for (const row of ytdRows) {
    ytdMap.set(row.employeeId, (ytdMap.get(row.employeeId) ?? 0) + row.tds);
  }

  const details = run.details.map((d) => ({
    id: d.id,
    employeeCode: d.employee.employeeCode,
    fullName: d.employee.fullName,
    panNumber: d.employee.panNumber ?? null,
    grossSalary: d.grossSalary,
    tds: d.tds,
    ytdTds: ytdMap.get(d.employeeId) ?? 0,
  }));

  const totals = {
    grossSalary: details.reduce((s, d) => s + d.grossSalary, 0),
    tds: details.reduce((s, d) => s + d.tds, 0),
    ytdTds: details.reduce((s, d) => s + d.ytdTds, 0),
  };

  return NextResponse.json({ runStatus: run.status, details, totals });
}
