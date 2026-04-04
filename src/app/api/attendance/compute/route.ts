import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { monthId: string };
    const { monthId } = body;

    if (!monthId) {
      return NextResponse.json({ error: "monthId required" }, { status: 400 });
    }

    const attendanceMonth = await db.attendanceMonth.findUnique({
      where: { id: monthId },
      include: { records: true },
    });

    if (!attendanceMonth) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    const daysInMonth = getDaysInMonth(attendanceMonth.year, attendanceMonth.month);
    let computed = 0;

    for (const record of attendanceMonth.records) {
      let workedDays = 0;
      let weekOffs = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const val = (record as Record<string, unknown>)[`day${d}`] as string | null;
        if (!val) continue;
        if (val === "P" || val === "PH") workedDays += 1;
        else if (val === "HD") workedDays += 0.5;
        else if (val === "WO") weekOffs += 1;
      }

      const total = workedDays + weekOffs;
      const otDays = Math.max(0, total - daysInMonth);
      const payableDays = total - otDays;

      await db.attendanceRecord.update({
        where: { id: record.id },
        data: {
          workedDays,
          weekOffs,
          otDays,
          payableDays,
        },
      });
      computed++;
    }

    return NextResponse.json({ success: true, computed });
  } catch (error) {
    console.error("compute error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
