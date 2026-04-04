import type { PayrollDetailWithEmployee } from "./generate-payslip-pdf";

export function generateBankNeftFile(
  details: PayrollDetailWithEmployee[],
  entityName: string,
  month: string,
  year: number
): Buffer {
  // Filter: skip zero/negative net, skip missing bank details
  const valid = details.filter(
    (d) =>
      d.netSalary > 0 &&
      d.employee.bankAccountNo &&
      d.employee.bankIfsc
  );

  // Sort by bankName, then employeeCode
  const sorted = [...valid].sort((a, b) => {
    const bankA = (a.employee.bankName ?? "").toLowerCase();
    const bankB = (b.employee.bankName ?? "").toLowerCase();
    if (bankA < bankB) return -1;
    if (bankA > bankB) return 1;
    return a.employee.employeeCode.localeCompare(b.employee.employeeCode);
  });

  const rows: string[] = [];

  // Header
  rows.push(
    `Sr No,Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Pay Amount,Narration`
  );

  const narration = `Salary ${month.slice(0, 3)} ${year}`;
  let srNo = 1;
  let grandTotal = 0;

  // Group by bank
  const banks = [...new Set(sorted.map((d) => d.employee.bankName ?? "Unknown"))];

  for (const bankName of banks) {
    const group = sorted.filter((d) => (d.employee.bankName ?? "Unknown") === bankName);
    let bankTotal = 0;

    for (const d of group) {
      const net = Math.round(d.netSalary);
      bankTotal += net;
      grandTotal += net;
      rows.push(
        [
          srNo,
          d.employee.employeeCode,
          d.employee.fullName,
          d.employee.bankName ?? "",
          d.employee.bankAccountNo ?? "",
          d.employee.bankIfsc ?? "",
          net,
          narration,
        ].join(",")
      );
      srNo++;
    }

    // Bank subtotal
    rows.push(
      [
        "",
        "",
        `${bankName} Total`,
        "",
        "",
        "",
        bankTotal,
        "",
      ].join(",")
    );
    rows.push(""); // blank line between groups
  }

  // Grand total
  rows.push(
    [
      "",
      "",
      "GRAND TOTAL",
      "",
      "",
      "",
      grandTotal,
      `${entityName} — ${month} ${year}`,
    ].join(",")
  );

  const csv = rows.join("\n");
  return Buffer.from(csv, "utf-8");
}
