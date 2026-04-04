import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [entities, locations, departments, subDepartments, designations, shiftCodes] =
      await Promise.all([
        db.entity.findMany({ orderBy: { name: "asc" } }),
        db.location.findMany({ orderBy: { name: "asc" } }),
        db.department.findMany({ orderBy: { name: "asc" } }),
        db.subDepartment.findMany({ orderBy: { name: "asc" } }),
        db.designation.findMany({ orderBy: { name: "asc" } }),
        db.shiftCode.findMany({ orderBy: { code: "asc" } }),
      ]);

    return NextResponse.json({
      entities,
      locations,
      departments,
      subDepartments,
      designations,
      shiftCodes,
    });
  } catch (error) {
    console.error("form-options error:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
