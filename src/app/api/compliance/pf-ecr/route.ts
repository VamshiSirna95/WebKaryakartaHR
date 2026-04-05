import { NextRequest, NextResponse } from "next/server";
import { generateECR } from "@/lib/generate-ecr";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId || !month || !year) {
      return NextResponse.json({ error: "entityId, month, year required" }, { status: 400 });
    }

    const { content, entityCode } = await generateECR(entityId, parseInt(month), parseInt(year));
    const monthName = MONTHS[parseInt(month) - 1];
    const filename = `ECR_${entityCode}_${monthName}_${year}.txt`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
