import { db } from "@/lib/db";

export async function generateECR(
  entityId: string,
  month: number,
  year: number
): Promise<{ content: string; entityCode: string }> {
  const run = await db.payrollRun.findUnique({
    where: { entityId_year_month: { entityId, year, month } },
    include: {
      entity: { select: { code: true, pfCode: true } },
      details: {
        include: {
          employee: {
            select: {
              uanNumber: true,
              fullName: true,
              dateOfJoining: true,
              gender: true,
            },
          },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  });

  if (!run) throw new Error("PayrollRun not found");
  if (run.status === "DRAFT") throw new Error("Payroll must be PROCESSED or LOCKED");

  const entityCode = run.entity.code;

  const lines: string[] = [];
  lines.push("#~#ANNEXURE-I ECR FILE#~#");

  for (const detail of run.details) {
    if (detail.pfEmployee <= 0) continue;

    const emp = detail.employee;
    const uan = emp.uanNumber ?? "0";
    const name = emp.fullName.toUpperCase();
    const grossWages = Math.round(detail.grossSalary);
    const epfWages = Math.round(Math.min(detail.earnedBasic, 15000));
    const epsWages = epfWages;
    const edliWages = epfWages;
    const pfEE = Math.round(detail.pfEmployee);
    const epsER = Math.round(epfWages * 0.0833);
    const pfER = Math.round(detail.pfEmployer) - epsER;
    const ncpDays = Math.max(0, 30 - Math.round(detail.payableDays));
    const refundAdvances = 0;

    lines.push(
      [uan, name, grossWages, epfWages, epsWages, edliWages, pfEE, epsER, pfER, ncpDays, refundAdvances].join("|")
    );
  }

  return { content: lines.join("\n"), entityCode };
}
