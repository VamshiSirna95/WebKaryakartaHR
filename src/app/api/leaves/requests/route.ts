import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { entityId };
    if (status && status !== "ALL") where.status = status;

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      where.fromDate = { gte: start, lte: end };
    }

    const requests = await db.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("leave requests GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
