import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { monthId: string };
    const { monthId } = body;

    if (!monthId) {
      return NextResponse.json({ error: "monthId required" }, { status: 400 });
    }

    await db.attendanceMonth.update({
      where: { id: monthId },
      data: { status: "LOCKED", lockedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("lock error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
