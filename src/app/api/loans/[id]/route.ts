import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as { status?: string };

    const updated = await db.loanAccount.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("loans PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
