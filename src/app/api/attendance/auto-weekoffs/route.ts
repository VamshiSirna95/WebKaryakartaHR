import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getSundays(year: number, month: number): number[] {
  const days = new Date(year, month, 0).getDate();
  const sundays: number[] = [];
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays.push(d);
  }
  return sundays;
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

    const sundays = getSundays(attendanceMonth.year, attendanceMonth.month);
    let updated = 0;

    for (const record of attendanceMonth.records) {
      const updates: Record<string, string> = {};
      for (const sunday of sundays) {
        const key = `day${sunday}` as keyof typeof record;
        const current = record[key] as string | null;
        if (!current) {
          updates[`day${sunday}`] = "WO";
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.attendanceRecord.update({
          where: { id: record.id },
          data: updates,
        });
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("auto-weekoffs error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
