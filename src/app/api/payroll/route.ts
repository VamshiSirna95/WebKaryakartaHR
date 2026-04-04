import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!entityId || !year || !month) {
      return NextResponse.json({ error: "entityId, year, month required" }, { status: 400 });
    }

    const run = await db.payrollRun.findUnique({
      where: {
        entityId_year_month: {
          entityId,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      include: {
        details: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                department: { select: { name: true } },
                location: { select: { code: true, name: true } },
              },
            },
          },
          orderBy: { employee: { employeeCode: "asc" } },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ run: null, details: [] });
    }

    return NextResponse.json({ run, details: run.details });
  } catch (error) {
    console.error("payroll GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
