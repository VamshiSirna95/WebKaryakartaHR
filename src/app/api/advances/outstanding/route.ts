import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json({ error: "entityId required" }, { status: 400 });
    }

    const loans = await db.loanAccount.findMany({
      where: {
        employee: { entityId },
        status: "ACTIVE",
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { employee: { employeeCode: "asc" } },
        { loanType: "asc" },
        { startYear: "asc" },
        { startMonth: "asc" },
      ],
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("advances/outstanding GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
