import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json({ error: "entityId required" }, { status: 400 });
    }

    const loans = await db.loanAccount.findMany({
      where: { employee: { entityId } },
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
      orderBy: [{ status: "asc" }, { employee: { employeeCode: "asc" } }],
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("loans GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      employeeId: string;
      loanType: string;
      principalAmount: number;
      emiAmount: number;
      tenure: number;
      startMonth: number;
      startYear: number;
      remarks?: string;
    };

    const { employeeId, loanType, principalAmount, emiAmount, tenure, startMonth, startYear, remarks } = body;

    if (!employeeId || !loanType || !principalAmount || !emiAmount || !tenure || !startMonth || !startYear) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const loan = await db.loanAccount.create({
      data: {
        employeeId,
        loanType,
        principalAmount,
        emiAmount,
        tenure,
        startMonth,
        startYear,
        outstandingBalance: principalAmount,
        totalPaid: 0,
        status: "ACTIVE",
        remarks: remarks ?? null,
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error("loans POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
