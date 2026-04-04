import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getCurrentFY(): number {
  const now = new Date();
  // FY starts April 1. If month >= 4 (April), current FY year = this year, else previous year
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      employeeId: string;
      leaveTypeId: string;
      entityId: string;
      fromDate: string;
      toDate: string;
      days: number;
      reason: string;
      isHalfDay?: boolean;
      halfDayType?: string;
    };

    const { employeeId, leaveTypeId, entityId, fromDate, toDate, days, reason } = body;
    const isHalfDay = body.isHalfDay ?? false;
    const halfDayType = body.halfDayType ?? null;

    if (!employeeId || !leaveTypeId || !entityId || !fromDate || !toDate || !reason) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (!days || days <= 0) {
      return NextResponse.json({ error: "days must be > 0" }, { status: 400 });
    }
    if (isHalfDay && days !== 0.5) {
      return NextResponse.json({ error: "Half day must have days = 0.5" }, { status: 400 });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      return NextResponse.json({ error: "fromDate must be <= toDate" }, { status: 400 });
    }

    // Validate employee
    const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true, status: true } });
    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee not found or not active" }, { status: 404 });
    }

    // Validate leave type
    const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId }, select: { id: true, isActive: true, code: true } });
    if (!leaveType || !leaveType.isActive) {
      return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 404 });
    }

    // Balance check (skip for LOP)
    if (leaveType.code !== "LOP") {
      const fyYear = getCurrentFY();
      const balance = await db.leaveBalance.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year: fyYear } },
      });
      if (!balance || balance.balance < days) {
        return NextResponse.json({ error: "Insufficient leave balance" }, { status: 400 });
      }
    }

    // Overlap check
    const overlap = await db.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { fromDate: { lte: to }, toDate: { gte: from } },
        ],
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "Overlapping leave request exists" }, { status: 409 });
    }

    const request = await db.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        entityId,
        fromDate: from,
        toDate: to,
        days,
        reason,
        isHalfDay,
        halfDayType,
        status: "PENDING",
      },
      include: {
        employee: { select: { employeeCode: true, fullName: true } },
        leaveType: { select: { code: true, name: true } },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("leave apply POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
