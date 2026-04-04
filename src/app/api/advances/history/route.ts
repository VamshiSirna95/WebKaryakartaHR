import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId required" }, { status: 400 });
    }

    const [employee, advances, loans] = await Promise.all([
      db.employee.findUnique({
        where: { id: employeeId },
        select: {
          employeeCode: true,
          fullName: true,
          department: { select: { name: true } },
        },
      }),
      db.advanceEntry.findMany({
        where: { employeeId },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      }),
      db.loanAccount.findMany({
        where: { employeeId },
        orderBy: [{ startYear: "desc" }, { startMonth: "desc" }],
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ employee, advances, loans });
  } catch (error) {
    console.error("advances/history GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
