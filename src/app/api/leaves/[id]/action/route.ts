import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getCurrentFY(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      action: "APPROVE" | "REJECT" | "CANCEL";
      approvedBy?: string;
      rejectionReason?: string;
    };

    const { action, approvedBy, rejectionReason } = body;
    if (!action || !["APPROVE", "REJECT", "CANCEL"].includes(action)) {
      return NextResponse.json({ error: "action must be APPROVE, REJECT, or CANCEL" }, { status: 400 });
    }

    const request = await db.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: { select: { code: true } } },
    });

    if (!request) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    if (action === "APPROVE") {
      if (request.status !== "PENDING") {
        return NextResponse.json({ error: "Only PENDING requests can be approved" }, { status: 400 });
      }

      await db.leaveRequest.update({
        where: { id },
        data: { status: "APPROVED", approvedBy: approvedBy ?? "HR Admin", approvedAt: new Date() },
      });

      // Deduct balance (skip for LOP)
      if (request.leaveType.code !== "LOP") {
        const fyYear = getCurrentFY();
        await db.leaveBalance.updateMany({
          where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: fyYear },
          data: { used: { increment: request.days }, balance: { decrement: request.days } },
        });
      }
    } else if (action === "REJECT") {
      if (request.status !== "PENDING") {
        return NextResponse.json({ error: "Only PENDING requests can be rejected" }, { status: 400 });
      }
      await db.leaveRequest.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: rejectionReason ?? null },
      });
    } else if (action === "CANCEL") {
      if (!["PENDING", "APPROVED"].includes(request.status)) {
        return NextResponse.json({ error: "Only PENDING or APPROVED requests can be cancelled" }, { status: 400 });
      }

      // Reverse balance if was APPROVED
      if (request.status === "APPROVED" && request.leaveType.code !== "LOP") {
        const fyYear = getCurrentFY();
        await db.leaveBalance.updateMany({
          where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: fyYear },
          data: { used: { decrement: request.days }, balance: { increment: request.days } },
        });
      }

      await db.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    }

    const updated = await db.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { employeeCode: true, fullName: true } },
        leaveType: { select: { code: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("leave action PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
