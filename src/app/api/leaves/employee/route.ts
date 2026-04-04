import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year");

    if (!employeeId || !year) {
      return NextResponse.json({ error: "employeeId and year required" }, { status: 400 });
    }

    const [balances, requests] = await Promise.all([
      db.leaveBalance.findMany({
        where: { employeeId, year: parseInt(year) },
        include: { leaveType: { select: { code: true, name: true } } },
        orderBy: { leaveType: { code: "asc" } },
      }),
      db.leaveRequest.findMany({
        where: { employeeId },
        include: { leaveType: { select: { code: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      balances: balances.map((b) => ({
        id: b.id,
        code: b.leaveType.code,
        name: b.leaveType.name,
        opening: b.opening,
        credited: b.credited,
        used: b.used,
        balance: b.balance,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        leaveType: r.leaveType,
        fromDate: r.fromDate,
        toDate: r.toDate,
        days: r.days,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("employee leave GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
