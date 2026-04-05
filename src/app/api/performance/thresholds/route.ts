import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });

  const thresholds = await db.performanceThreshold.findMany({
    where: { entityId },
    include: { department: { select: { id: true, name: true } } },
    orderBy: [{ departmentId: "asc" }],
  });

  return NextResponse.json(thresholds);
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entityId: string;
      departmentId?: string | null;
      goodBelow: number;
      improveBelow: number;
    };
    const { entityId, departmentId = null, goodBelow, improveBelow } = body;

    if (!entityId || goodBelow === undefined || improveBelow === undefined) {
      return NextResponse.json({ error: "entityId, goodBelow, improveBelow required" }, { status: 400 });
    }
    if (goodBelow >= improveBelow) {
      return NextResponse.json({ error: "goodBelow must be less than improveBelow" }, { status: 400 });
    }

    const deptIdOrNull = departmentId ?? null;
    const record = await db.performanceThreshold.upsert({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { entityId_departmentId: { entityId, departmentId: deptIdOrNull as any } },
      create: { entityId, departmentId: deptIdOrNull, goodBelow, improveBelow },
      update: { goodBelow, improveBelow },
      include: { department: { select: { id: true, name: true } } },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("thresholds PUT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const departmentId = searchParams.get("departmentId");

  if (!entityId || !departmentId) {
    return NextResponse.json({ error: "entityId and departmentId required" }, { status: 400 });
  }

  await db.performanceThreshold.deleteMany({
    where: { entityId, departmentId },
  });

  return NextResponse.json({ ok: true });
}
