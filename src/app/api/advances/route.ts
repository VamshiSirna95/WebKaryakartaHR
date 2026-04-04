import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_TYPES = ["BANK_ADVANCE", "CASH_ADVANCE", "JIFY_ADVANCE", "LOAN_EMI", "CASH_LOAN_EMI"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId || !month || !year) {
      return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
    }

    const entries = await db.advanceEntry.findMany({
      where: {
        employee: { entityId },
        month: parseInt(month),
        year: parseInt(year),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ employee: { employeeCode: "asc" } }, { createdAt: "asc" }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("advances GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      employeeId: string;
      type: string;
      amount: number;
      month: number;
      year: number;
      date?: string;
      remarks?: string;
    };

    const { employeeId, type, amount, month, year, date, remarks } = body;

    if (!employeeId || !type || !month || !year) {
      return NextResponse.json({ error: "employeeId, type, month, year required" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }

    const entry = await db.advanceEntry.create({
      data: {
        employeeId,
        type,
        amount,
        month,
        year,
        date: date ? new Date(date) : null,
        remarks: remarks ?? null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("advances POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
