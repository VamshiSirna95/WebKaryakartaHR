import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const year = searchParams.get("year");

    if (!entityId || !year) {
      return NextResponse.json({ error: "entityId and year required" }, { status: 400 });
    }

    const employees = await db.employee.findMany({
      where: { entityId, status: "ACTIVE" },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        department: { select: { name: true } },
        location: { select: { code: true } },
        leaveBalances: {
          where: { year: parseInt(year) },
          include: { leaveType: { select: { code: true, name: true, annualQuota: true } } },
          orderBy: { leaveType: { code: "asc" } },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    const result = employees.map((emp) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      department: emp.department?.name ?? null,
      location: emp.location?.code ?? null,
      balances: emp.leaveBalances.map((b) => ({
        id: b.id,
        leaveTypeCode: b.leaveType.code,
        leaveTypeName: b.leaveType.name,
        annualQuota: b.leaveType.annualQuota,
        opening: b.opening,
        credited: b.credited,
        used: b.used,
        balance: b.balance,
      })),
    }));

    return NextResponse.json({ employees: result });
  } catch (error) {
    console.error("leave balances GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
