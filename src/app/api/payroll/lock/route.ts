import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { payrollRunId: string };
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json({ error: "payrollRunId required" }, { status: 400 });
    }

    const run = await db.payrollRun.findUnique({ where: { id: payrollRunId } });

    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    if (run.status !== "PROCESSED") {
      return NextResponse.json(
        { error: "Payroll must be PROCESSED before locking" },
        { status: 400 }
      );
    }

    const updated = await db.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "LOCKED", lockedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("payroll/lock error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
