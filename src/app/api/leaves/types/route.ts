import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });

    const types = await db.leaveType.findMany({
      where: { entityId },
      orderBy: { code: "asc" },
    });

    return NextResponse.json(types);
  } catch (error) {
    console.error("leave types GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      entityId: string;
      code: string;
      name: string;
      annualQuota: number;
      carryForwardMax?: number;
      requiresApproval?: boolean;
      applicableGender?: string;
      maxConsecutiveDays?: number;
      isPaid?: boolean;
    };

    const { entityId, code, name, annualQuota } = body;
    if (!entityId || !code || !name || annualQuota === undefined) {
      return NextResponse.json({ error: "entityId, code, name, annualQuota required" }, { status: 400 });
    }

    const existing = await db.leaveType.findUnique({ where: { entityId_code: { entityId, code } } });
    if (existing) return NextResponse.json({ error: "Leave type with this code already exists" }, { status: 409 });

    const leaveType = await db.leaveType.create({
      data: {
        entityId,
        code,
        name,
        annualQuota,
        carryForwardMax: body.carryForwardMax ?? 0,
        requiresApproval: body.requiresApproval ?? true,
        applicableGender: body.applicableGender ?? null,
        maxConsecutiveDays: body.maxConsecutiveDays ?? null,
        isPaid: body.isPaid ?? true,
      },
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    console.error("leave types POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
