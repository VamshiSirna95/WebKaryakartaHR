import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");
  const locationId = searchParams.get("locationId");
  const departmentId = searchParams.get("departmentId");

  if (!entityId || isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
  }

  const where: Record<string, unknown> = { entityId, month, year };
  if (locationId) where["employee"] = { ...(where["employee"] as object ?? {}), locationId };
  if (departmentId) where["employee"] = { ...(where["employee"] as object ?? {}), departmentId };

  const records = await db.salesRecord.findMany({
    where,
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          location: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, name: true } },
          subDepartment: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { perDayAvg: "desc" },
  });

  return NextResponse.json(records);
}

// ── POST ────────────────────────────────────────────────────────────────────
interface RecordInput {
  employeeId: string;
  totalSales: number;
  notes?: string;
}

interface PostBody {
  month: number;
  year: number;
  entityId: string;
  records: RecordInput[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PostBody;
    const { month, year, entityId, records } = body;

    if (!entityId || !month || !year || !Array.isArray(records)) {
      return NextResponse.json({ error: "entityId, month, year, records required" }, { status: 400 });
    }

    let saved = 0;
    let skipped = 0;
    const warnings: string[] = [];

    // Load thresholds for entity (entity default + department overrides)
    const thresholds = await db.performanceThreshold.findMany({
      where: { entityId },
    });
    const defaultThreshold = thresholds.find((t) => t.departmentId === null) ?? { goodBelow: 6.0, improveBelow: 8.0 };

    // Fetch AttendanceMonth to get records
    const attendanceMonth = await db.attendanceMonth.findFirst({
      where: { entityId, month, year },
      include: {
        records: { select: { employeeId: true, payableDays: true } },
      },
    });

    // Fetch PayrollRun
    const payrollRun = await db.payrollRun.findFirst({
      where: { entityId, month, year },
      include: {
        details: { select: { employeeId: true, grossSalary: true } },
      },
    });

    // Build lookup maps
    const attMap = new Map<string, number>();
    for (const r of attendanceMonth?.records ?? []) {
      attMap.set(r.employeeId, Number(r.payableDays ?? 0));
    }
    const payMap = new Map<string, number>();
    for (const d of payrollRun?.details ?? []) {
      payMap.set(d.employeeId, d.grossSalary);
    }

    // Get employees' departments for threshold lookup
    const employeeIds = records.map((r) => r.employeeId);
    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, employeeCode: true, departmentId: true },
    });
    const empDeptMap = new Map(employees.map((e) => [e.id, e.departmentId]));

    for (const rec of records) {
      const workedDays = attMap.get(rec.employeeId) ?? 0;
      const grossSalary = payMap.get(rec.employeeId) ?? 0;

      if (workedDays === 0) {
        const emp = employees.find((e) => e.id === rec.employeeId);
        warnings.push(`${emp?.employeeCode ?? rec.employeeId}: attendance not found, skipped`);
        skipped++;
        continue;
      }
      if (grossSalary === 0) {
        const emp = employees.find((e) => e.id === rec.employeeId);
        warnings.push(`${emp?.employeeCode ?? rec.employeeId}: payroll not processed, skipped`);
        skipped++;
        continue;
      }

      const perDayAvg = rec.totalSales / workedDays;
      const salaryRatio = (grossSalary / rec.totalSales) * 100;

      // Find applicable threshold
      const deptId = empDeptMap.get(rec.employeeId) ?? null;
      const deptThreshold = deptId ? thresholds.find((t) => t.departmentId === deptId) : null;
      const threshold = deptThreshold ?? defaultThreshold;

      const status =
        salaryRatio < threshold.goodBelow ? "GOOD" :
        salaryRatio < threshold.improveBelow ? "IMPROVE" : "POOR";

      await db.salesRecord.upsert({
        where: { employeeId_month_year: { employeeId: rec.employeeId, month, year } },
        create: {
          employeeId: rec.employeeId, entityId, month, year,
          totalSales: rec.totalSales, workedDays, grossSalary,
          perDayAvg, salaryRatio, status, notes: rec.notes ?? null,
        },
        update: {
          totalSales: rec.totalSales, workedDays, grossSalary,
          perDayAvg, salaryRatio, status, notes: rec.notes ?? null,
        },
      });
      saved++;
    }

    return NextResponse.json({ saved, skipped, warnings });
  } catch (err) {
    console.error("performance POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
