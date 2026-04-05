import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const status = searchParams.get("status") ?? "ACTIVE";
    const departmentId = searchParams.get("departmentId");

    if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });

    const employees = await db.employee.findMany({
      where: {
        entityId,
        status,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        location: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } },
      },
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("employees GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
