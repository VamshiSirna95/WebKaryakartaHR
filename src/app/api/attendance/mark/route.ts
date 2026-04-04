import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_STATUSES = new Set(["P", "A", "HD", "WO", "PH", "SL", "CL", "EL", ""]);

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { recordId: string; day: number; status: string | null };
    const { recordId, day, status } = body;

    if (!recordId || typeof day !== "number" || day < 1 || day > 31) {
      return NextResponse.json({ error: "Invalid recordId or day" }, { status: 400 });
    }

    const normalizedStatus = status ?? "";
    if (!VALID_STATUSES.has(normalizedStatus)) {
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 });
    }

    // Check if month is locked
    const record = await db.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { attendanceMonth: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (record.attendanceMonth.status === "LOCKED") {
      return NextResponse.json({ error: "Attendance month is locked" }, { status: 403 });
    }

    const fieldKey = `day${day}` as `day${number}`;
    await db.attendanceRecord.update({
      where: { id: recordId },
      data: { [fieldKey]: normalizedStatus || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("attendance mark error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
