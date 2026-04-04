import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_TYPES = ["BANK_ADVANCE", "CASH_ADVANCE", "JIFY_ADVANCE", "LOAN_EMI", "CASH_LOAN_EMI"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      type?: string;
      amount?: number;
      date?: string;
      remarks?: string;
    };

    if (body.type && !VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }

    const updated = await db.advanceEntry.update({
      where: { id },
      data: {
        ...(body.type ? { type: body.type } : {}),
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.date !== undefined ? { date: body.date ? new Date(body.date) : null } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("advances PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entry = await db.advanceEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if payroll for that month is locked
    const emp = await db.employee.findUnique({ where: { id: entry.employeeId }, select: { entityId: true } });
    if (emp) {
      const run = await db.payrollRun.findUnique({
        where: { entityId_year_month: { entityId: emp.entityId, year: entry.year, month: entry.month } },
      });
      if (run?.status === "LOCKED") {
        return NextResponse.json({ error: "Cannot delete — payroll is locked for this month" }, { status: 400 });
      }
    }

    await db.advanceEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("advances DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
