import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      select: { employeeCode: true },
      orderBy: { employeeCode: "desc" },
    });

    let maxNum = 0;
    for (const emp of employees) {
      const match = emp.employeeCode.match(/^E(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextCode = `E${String(maxNum + 1).padStart(3, "0")}`;
    return NextResponse.json({ code: nextCode });
  } catch {
    return NextResponse.json({ code: "E001" });
  }
}
