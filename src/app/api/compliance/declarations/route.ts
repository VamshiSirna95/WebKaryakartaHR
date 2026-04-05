import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityId = searchParams.get("entityId");
  const fy = searchParams.get("fy");

  if (!entityId || !fy) {
    return NextResponse.json({ error: "entityId and fy required" }, { status: 400 });
  }

  const declarations = await db.investmentDeclaration.findMany({
    where: { entityId, financialYear: fy },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { employee: { employeeCode: "asc" } },
  });

  return NextResponse.json(declarations);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      employeeId: string;
      entityId: string;
      financialYear: string;
      regime: string;
      sec80C_ppf: number;
      sec80C_elss: number;
      sec80C_lic: number;
      sec80C_nsc: number;
      sec80C_tuition: number;
      sec80C_homeLoan: number;
      sec80C_fd: number;
      sec80C_sukanya: number;
      sec80C_other: number;
      sec80D_self: number;
      sec80D_parents: number;
      sec24_homeLoanInterest: number;
      sec80E_eduLoan: number;
      sec80G_donation: number;
      nps_80CCD: number;
      hraRentPaid: number;
      hraMetro: boolean;
      status?: string;
    };

    const {
      employeeId, entityId, financialYear, regime,
      sec80C_ppf = 0, sec80C_elss = 0, sec80C_lic = 0, sec80C_nsc = 0,
      sec80C_tuition = 0, sec80C_homeLoan = 0, sec80C_fd = 0, sec80C_sukanya = 0,
      sec80C_other = 0, sec80D_self = 0, sec80D_parents = 0,
      sec24_homeLoanInterest = 0, sec80E_eduLoan = 0, sec80G_donation = 0,
      nps_80CCD = 0, hraRentPaid = 0, hraMetro = false, status = "DECLARED",
    } = body;

    // Compute totals
    const raw80C = sec80C_ppf + sec80C_elss + sec80C_lic + sec80C_nsc +
      sec80C_tuition + sec80C_homeLoan + sec80C_fd + sec80C_sukanya + sec80C_other;
    const total80C = Math.min(raw80C, 150000);
    const totalDeductions = total80C + sec80D_self + sec80D_parents +
      sec24_homeLoanInterest + sec80E_eduLoan + sec80G_donation + nps_80CCD;

    const data = {
      entityId, financialYear, regime,
      sec80C_ppf, sec80C_elss, sec80C_lic, sec80C_nsc, sec80C_tuition,
      sec80C_homeLoan, sec80C_fd, sec80C_sukanya, sec80C_other,
      sec80D_self, sec80D_parents, sec24_homeLoanInterest,
      sec80E_eduLoan, sec80G_donation, nps_80CCD,
      hraRentPaid, hraMetro,
      total80C, totalDeductions, status,
    };

    const record = await db.investmentDeclaration.upsert({
      where: { employeeId_financialYear: { employeeId, financialYear } },
      create: { employeeId, ...data },
      update: data,
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save declaration" }, { status: 500 });
  }
}
