import { db } from "@/lib/db";

// Map leave type code → attendance status code
const LEAVE_TO_ATTENDANCE: Record<string, string> = {
  CL: "CL",
  SL: "SL",
  EL: "EL",
  PL: "EL",   // Privilege Leave → EL in attendance
  LOP: "A",   // Loss of Pay → Absent
  ML: "SL",   // Maternity → SL
  PTL: "SL",  // Paternity → SL
};

interface LeaveRequestForSync {
  id: string;
  employeeId: string;
  entityId: string;
  fromDate: Date | string;
  toDate: Date | string;
  days: number;
  isHalfDay: boolean;
  leaveType: { code: string };
}

function getDatesInRange(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(from);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function syncLeaveToAttendance(
  request: LeaveRequestForSync,
  action: "MARK" | "UNMARK"
): Promise<void> {
  const leaveCode = request.leaveType.code;
  const attendanceStatus = MARK_STATUS(leaveCode, request.isHalfDay);

  const from = new Date(request.fromDate);
  const to = new Date(request.toDate);
  const dates = getDatesInRange(from, to);

  for (const date of dates) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const dayNum = date.getUTCDate();
    const dayKey = `day${dayNum}` as `day${number}`;

    // Find AttendanceMonth for entity + year + month
    let attMonth = await db.attendanceMonth.findUnique({
      where: { year_month_entityId: { year, month, entityId: request.entityId } },
    });

    if (action === "MARK" && !attMonth) {
      // Create it if marking and it doesn't exist
      attMonth = await db.attendanceMonth.create({
        data: { year, month, entityId: request.entityId, status: "OPEN" },
      });
    }

    if (!attMonth) continue; // If UNMARK and no month, nothing to do

    // Skip locked months
    if (attMonth.status === "LOCKED") continue;

    // Find or create AttendanceRecord
    let record = await db.attendanceRecord.findUnique({
      where: {
        attendanceMonthId_employeeId: {
          attendanceMonthId: attMonth.id,
          employeeId: request.employeeId,
        },
      },
    });

    if (action === "MARK" && !record) {
      record = await db.attendanceRecord.create({
        data: { attendanceMonthId: attMonth.id, employeeId: request.employeeId },
      });
    }

    if (!record) continue;

    const currentValue = (record as Record<string, unknown>)[dayKey] as string | null;

    if (action === "MARK") {
      // Only overwrite null or "A" — never overwrite P, WO, PH
      if (currentValue === null || currentValue === "" || currentValue === "A") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.attendanceRecord.update({ where: { id: record.id }, data: { [dayKey]: attendanceStatus } as any });
      }
    } else {
      // UNMARK: only clear if the value still matches what we would have set
      if (currentValue === attendanceStatus) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.attendanceRecord.update({ where: { id: record.id }, data: { [dayKey]: null } as any });
      }
    }
  }
}

function MARK_STATUS(leaveCode: string, isHalfDay: boolean): string {
  if (isHalfDay) return "HD";
  return LEAVE_TO_ATTENDANCE[leaveCode] ?? "A";
}
