import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getSundays(year: number, month: number): number[] {
  const days = getDaysInMonth(year, month);
  const sundays: number[] = [];
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays.push(d);
  }
  return sundays;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? "");
  const entityId = searchParams.get("entityId") ?? "";
  const locationId = searchParams.get("locationId") ?? "";

  if (!year || !month || !entityId) {
    return NextResponse.json({ error: "year, month, entityId required" }, { status: 400 });
  }

  try {
    // Find or create AttendanceMonth
    let attendanceMonth = await db.attendanceMonth.findUnique({
      where: { year_month_entityId: { year, month, entityId } },
    });
    if (!attendanceMonth) {
      attendanceMonth = await db.attendanceMonth.create({
        data: { year, month, entityId, status: "OPEN" },
      });
    }

    // Find active employees
    const whereClause: Record<string, unknown> = {
      entityId,
      status: { in: ["ACTIVE", "PROBATION"] },
    };
    if (locationId && locationId !== "all") whereClause.locationId = locationId;

    const employees = await db.employee.findMany({
      where: whereClause,
      include: { department: true, location: true },
      orderBy: { employeeCode: "asc" },
    });

    // Find or create AttendanceRecords for each employee
    const records = await Promise.all(
      employees.map(async (emp) => {
        let record = await db.attendanceRecord.findUnique({
          where: {
            attendanceMonthId_employeeId: {
              attendanceMonthId: attendanceMonth!.id,
              employeeId: emp.id,
            },
          },
        });
        if (!record) {
          record = await db.attendanceRecord.create({
            data: {
              attendanceMonthId: attendanceMonth!.id,
              employeeId: emp.id,
            },
          });
        }
        return { emp, record };
      })
    );

    // Fetch holidays for this month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const holidays = await db.holiday.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        OR: [{ entityId }, { entityId: null }],
      },
    });

    const daysInMonth = getDaysInMonth(year, month);
    const sundays = getSundays(year, month);

    const holidayList = holidays.map((h) => ({
      day: new Date(h.date).getDate(),
      name: h.name,
    }));

    const employeeData = records.map(({ emp, record }) => {
      const days: Record<string, string | null> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `day${d}` as keyof typeof record;
        days[String(d)] = (record[key] as string | null) ?? null;
      }

      return {
        recordId: record.id,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.fullName,
        department: emp.department.name,
        location: emp.location.name,
        days,
        workedDays: record.workedDays !== null ? Number(record.workedDays) : null,
        weekOffs: record.weekOffs ?? null,
        otDays: record.otDays !== null ? Number(record.otDays) : null,
        payableDays: record.payableDays !== null ? Number(record.payableDays) : null,
      };
    });

    return NextResponse.json({
      monthId: attendanceMonth.id,
      year,
      month,
      daysInMonth,
      status: attendanceMonth.status,
      sundays,
      holidays: holidayList,
      employees: employeeData,
    });
  } catch (error) {
    console.error("attendance GET error:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
