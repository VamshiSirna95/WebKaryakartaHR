import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (!entityId || isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
  }

  const records = await db.salesRecord.findMany({
    where: { entityId, month, year },
    include: {
      employee: {
        select: {
          locationId: true,
          location: { select: { id: true, name: true } },
          subDepartmentId: true,
          subDepartment: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (records.length === 0) {
    return NextResponse.json({
      totalSales: 0, avgRatio: 0,
      statusCounts: { GOOD: 0, IMPROVE: 0, POOR: 0 },
      byLocation: [], bySubDepartment: [],
    });
  }

  const totalSales = records.reduce((s, r) => s + r.totalSales, 0);
  const avgRatio = records.reduce((s, r) => s + r.salaryRatio, 0) / records.length;
  const statusCounts = { GOOD: 0, IMPROVE: 0, POOR: 0 };
  for (const r of records) {
    if (r.status === "GOOD") statusCounts.GOOD++;
    else if (r.status === "IMPROVE") statusCounts.IMPROVE++;
    else statusCounts.POOR++;
  }

  // Group by location
  const locMap = new Map<string, { locationId: string; locationName: string; totalSales: number; ratioSum: number; count: number; statusCounts: { GOOD: number; IMPROVE: number; POOR: number } }>();
  for (const r of records) {
    const locId = r.employee.locationId;
    const locName = r.employee.location?.name ?? "Unknown";
    if (!locMap.has(locId)) {
      locMap.set(locId, { locationId: locId, locationName: locName, totalSales: 0, ratioSum: 0, count: 0, statusCounts: { GOOD: 0, IMPROVE: 0, POOR: 0 } });
    }
    const loc = locMap.get(locId)!;
    loc.totalSales += r.totalSales;
    loc.ratioSum += r.salaryRatio;
    loc.count++;
    if (r.status === "GOOD") loc.statusCounts.GOOD++;
    else if (r.status === "IMPROVE") loc.statusCounts.IMPROVE++;
    else loc.statusCounts.POOR++;
  }
  const byLocation = Array.from(locMap.values()).map((l) => ({
    ...l, avgRatio: l.count > 0 ? l.ratioSum / l.count : 0,
  })).sort((a, b) => b.totalSales - a.totalSales);

  // Group by sub-department
  const subMap = new Map<string, { subDeptId: string; subDeptName: string; totalSales: number; ratioSum: number; count: number }>();
  for (const r of records) {
    const subId = r.employee.subDepartmentId ?? "none";
    const subName = r.employee.subDepartment?.name ?? "General";
    if (!subMap.has(subId)) {
      subMap.set(subId, { subDeptId: subId, subDeptName: subName, totalSales: 0, ratioSum: 0, count: 0 });
    }
    const sub = subMap.get(subId)!;
    sub.totalSales += r.totalSales;
    sub.ratioSum += r.salaryRatio;
    sub.count++;
  }
  const bySubDepartment = Array.from(subMap.values()).map((s) => ({
    ...s, avgRatio: s.count > 0 ? s.ratioSum / s.count : 0,
  })).sort((a, b) => b.totalSales - a.totalSales);

  return NextResponse.json({ totalSales, avgRatio, statusCounts, byLocation, bySubDepartment });
}
