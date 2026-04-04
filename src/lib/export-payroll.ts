import * as XLSX from "xlsx";

export interface ExportDetail {
  employee: {
    employeeCode: string;
    fullName: string;
    department: { name: string } | null;
    location: { code: string; name: string } | null;
  };
  payableDays: number;
  earnedBasic: number;
  earnedHra: number;
  earnedSpecial: number;
  earnedOt: number;
  earnedLeave: number;
  earnedLabour: number;
  earnedTa: number;
  salaryArrears: number;
  grossSalary: number;
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  tds: number;
  uniformDeduction: number;
  bankAdvance: number;
  cashAdvance: number;
  jifyAdvance: number;
  loanEmi: number;
  cashLoanEmi: number;
  totalDeductions: number;
  netSalary: number;
}

const HEADERS = [
  "Code", "Name", "Department", "Location", "Days",
  "Basic", "HRA", "Special", "OT", "Leave", "Labour", "TA", "Arrears", "Gross",
  "PF", "ESI", "PT", "TDS", "Uniform", "Advances", "Loans",
  "Total Ded", "Net Pay",
];

export function exportSalaryRegister(
  details: ExportDetail[],
  month: string,
  year: number,
  entityName: string
) {
  const rows: (string | number)[][] = [HEADERS];

  for (const d of details) {
    const advances = d.bankAdvance + d.cashAdvance + d.jifyAdvance;
    const loans = d.loanEmi + d.cashLoanEmi;
    rows.push([
      d.employee.employeeCode,
      d.employee.fullName,
      d.employee.department?.name ?? "",
      d.employee.location?.code ?? "",
      d.payableDays,
      d.earnedBasic,
      d.earnedHra,
      d.earnedSpecial,
      d.earnedOt,
      d.earnedLeave,
      d.earnedLabour,
      d.earnedTa,
      d.salaryArrears,
      d.grossSalary,
      d.pfEmployee,
      d.esiEmployee,
      d.professionalTax,
      d.tds,
      d.uniformDeduction,
      advances,
      loans,
      d.totalDeductions,
      d.netSalary,
    ]);
  }

  // Totals row
  const sum = (key: keyof ExportDetail) =>
    details.reduce((acc, d) => acc + (typeof d[key] === "number" ? (d[key] as number) : 0), 0);

  const advances = sum("bankAdvance") + sum("cashAdvance") + sum("jifyAdvance");
  const loans = sum("loanEmi") + sum("cashLoanEmi");

  rows.push([
    "TOTAL", "", "", "",
    details.reduce((a, d) => a + d.payableDays, 0),
    sum("earnedBasic"), sum("earnedHra"), sum("earnedSpecial"),
    sum("earnedOt"), sum("earnedLeave"), sum("earnedLabour"), sum("earnedTa"), sum("salaryArrears"),
    sum("grossSalary"),
    sum("pfEmployee"), sum("esiEmployee"), sum("professionalTax"), sum("tds"), sum("uniformDeduction"),
    advances, loans,
    sum("totalDeductions"), sum("netSalary"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 8 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 6 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    { wch: 10 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Salary Register - ${month} ${year}`);

  const safeName = entityName.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `${safeName}_Salary_Register_${month}_${year}.xlsx`);
}
