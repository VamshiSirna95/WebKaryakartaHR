import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");
  const sortBy = searchParams.get("sortBy") ?? "perDayAvg";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const limit = parseInt(searchParams.get("limit") ?? "20");

  if (!entityId || isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
  }

  const validSortFields = ["perDayAvg", "salaryRatio", "totalSales", "grossSalary"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "perDayAvg";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const records = await db.salesRecord.findMany({
    where: { entityId, month, year },
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
    orderBy: { [sortField]: sortOrder },
    take: limit,
  });

  const ranked = records.map((r, i) => ({ ...r, rank: i + 1 }));
  return NextResponse.json(ranked);
}
