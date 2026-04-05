import { db } from "@/lib/db";

export async function generateESIFile(
  entityId: string,
  month: number,
  year: number
): Promise<{ content: string; entityCode: string }> {
  const run = await db.payrollRun.findUnique({
    where: { entityId_year_month: { entityId, year, month } },
    include: {
      entity: { select: { code: true } },
      details: {
        include: {
          employee: { select: { esiNumber: true, fullName: true } },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  });

  if (!run) throw new Error("PayrollRun not found");
  if (run.status === "DRAFT") throw new Error("Payroll must be PROCESSED or LOCKED");

  const applicable = run.details.filter((d) => d.esiEmployee > 0);

  const rows: string[] = [
    "IP Number,IP Name,No of Days Worked,Total Wages,IP Contribution,Employer Contribution,Total Contribution",
  ];

  let totalDays = 0, totalWages = 0, totalEE = 0, totalER = 0;

  for (const d of applicable) {
    const days = Math.round(d.workedDays);
    const wages = Math.round(d.grossSalary);
    const ee = Math.round(d.esiEmployee);
    const er = Math.round(d.esiEmployer);
    totalDays += days;
    totalWages += wages;
    totalEE += ee;
    totalER += er;
    rows.push(`${d.employee.esiNumber ?? ""},${d.employee.fullName},${days},${wages},${ee},${er},${ee + er}`);
  }

  rows.push(`TOTAL,,${totalDays},${totalWages},${totalEE},${totalER},${totalEE + totalER}`);

  return { content: rows.join("\n"), entityCode: run.entity.code };
}
