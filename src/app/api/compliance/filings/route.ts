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

    const filings = await db.complianceFiling.findMany({
      where: { entityId, year: parseInt(year) },
      orderBy: [{ month: "desc" }, { type: "asc" }],
    });

    return NextResponse.json(filings);
  } catch (error) {
    console.error("filings GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      entityId: string;
      type: string;
      month: number;
      year: number;
      referenceNo?: string;
      amount?: number;
      remarks?: string;
    };

    const { entityId, type, month, year } = body;
    if (!entityId || !type || !month || !year) {
      return NextResponse.json({ error: "entityId, type, month, year required" }, { status: 400 });
    }

    // Calculate due date
    const dueDay = type === "PT" ? 21 : 15;
    const dueMonth = month === 12 ? 1 : month + 1;
    const dueYear = month === 12 ? year + 1 : year;
    const dueDate = new Date(dueYear, dueMonth - 1, dueDay);

    const filing = await db.complianceFiling.upsert({
      where: { entityId_type_month_year: { entityId, type, month, year } },
      create: {
        entityId,
        type,
        month,
        year,
        dueDate,
        status: "FILED",
        filedAt: new Date(),
        filedBy: "HR Admin",
        referenceNo: body.referenceNo ?? null,
        amount: body.amount ?? null,
        remarks: body.remarks ?? null,
      },
      update: {
        status: "FILED",
        filedAt: new Date(),
        filedBy: "HR Admin",
        referenceNo: body.referenceNo ?? null,
        amount: body.amount ?? null,
        remarks: body.remarks ?? null,
      },
    });

    return NextResponse.json(filing, { status: 201 });
  } catch (error) {
    console.error("filings POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
