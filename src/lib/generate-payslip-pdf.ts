/* eslint-disable @typescript-eslint/no-require-imports */
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces";

// pdfmake/lib/printer is the server-side (Node.js) printer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PdfPrinter: new (fonts: Record<string, unknown>) => { createPdfKitDocument: (def: TDocumentDefinitions) => NodeJS.EventEmitter & { end: () => void } } =
  require("pdfmake/build/pdfmake");

// Load Roboto from pdfmake's built-in vfs
const vfs = require("pdfmake/build/vfs_fonts").pdfMake.vfs as Record<string, string>;

PdfPrinter.prototype.vfs = vfs;

const fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

export interface PayrollDetailWithEmployee {
  id: string;
  payableDays: number;
  workedDays: number;
  otDays: number;
  leaveEncashDays: number;
  labourHoliday: number;
  salary: number;
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
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
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
  gratuity: number;
  ctc: number;
  employee: {
    employeeCode: string;
    fullName: string;
    dateOfJoining: Date | string;
    bankAccountNo: string | null;
    bankName: string | null;
    bankIfsc: string | null;
    bankBranch: string | null;
    department: { name: string } | null;
    designation: { name: string } | null;
    location: { code: string; name: string } | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function inr(n: number): string {
  return "Rs." + Math.round(n).toLocaleString("en-IN");
}

function maskAccount(acc: string | null): string {
  if (!acc) return "N/A";
  if (acc.length <= 4) return acc;
  return "X".repeat(acc.length - 4) + acc.slice(-4);
}

function bankDisplay(emp: PayrollDetailWithEmployee["employee"]): string {
  const name = emp.bankName ?? "N/A";
  const masked = maskAccount(emp.bankAccountNo);
  return `${name} (${masked})`;
}

function formatDate(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Number to Words (Indian English) ─────────────────────────────────────────

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n] + " ";
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
  return ones[Math.floor(n / 100)] + " Hundred " + belowThousand(n % 100);
}

export function numberToWords(n: number): string {
  const amount = Math.round(n);
  if (amount === 0) return "Rupees Zero Only";
  let result = "";
  let rem = amount;

  if (rem >= 10000000) {
    result += belowThousand(Math.floor(rem / 10000000)) + "Crore ";
    rem %= 10000000;
  }
  if (rem >= 100000) {
    result += belowThousand(Math.floor(rem / 100000)) + "Lakh ";
    rem %= 100000;
  }
  if (rem >= 1000) {
    result += belowThousand(Math.floor(rem / 1000)) + "Thousand ";
    rem %= 1000;
  }
  result += belowThousand(rem);
  return "Rupees " + result.trim().replace(/\s+/g, " ") + " Only";
}

// ── PDF Builder ───────────────────────────────────────────────────────────────

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function tc(obj: Record<string, unknown>): TableCell {
  return obj as unknown as TableCell;
}

function buildPayslipContent(
  detail: PayrollDetailWithEmployee,
  entityName: string,
  month: string,
  year: number,
  pageBreak: boolean
): Content[] {
  const emp = detail.employee;
  const doj = formatDate(emp.dateOfJoining);

  function infoItem(label: string, value: string): Content {
    return {
      stack: [
        { text: label, fontSize: 7, color: "#888888" },
        { text: value, fontSize: 9, bold: true, color: "#111111" },
      ],
      margin: [0, 0, 0, 6],
    } as Content;
  }

  function earningCell(label: string, amount: number): TableCell[] {
    return [
      tc({ text: label, fontSize: 9, color: "#444444", border: [true, false, false, false], margin: [4, 2, 4, 2] }),
      tc({ text: inr(amount), fontSize: 9, alignment: "right", color: amount > 0 ? "#111111" : "#aaaaaa", border: [false, false, false, false], margin: [4, 2, 4, 2] }),
    ];
  }

  function deductionCell(label: string, amount: number): TableCell[] {
    return [
      tc({ text: label, fontSize: 9, color: "#444444", border: [false, false, false, false], margin: [4, 2, 4, 2] }),
      tc({ text: inr(amount), fontSize: 9, alignment: "right", color: amount > 0 ? "#cc2200" : "#aaaaaa", border: [false, false, true, false], margin: [4, 2, 4, 2] }),
    ];
  }

  const earningsRows: [string, number][] = [
    ["Earned Basic", detail.earnedBasic],
    ["Earned HRA", detail.earnedHra],
    ["Earned Special", detail.earnedSpecial],
    ["Earned OT", detail.earnedOt],
    ["Leave Encashment", detail.earnedLeave],
    ["Labour Holiday", detail.earnedLabour],
    ["Earned TA", detail.earnedTa],
    ["Salary Arrears", detail.salaryArrears],
    ["", 0],
    ["", 0],
  ];

  const deductionsRows: [string, number][] = [
    ["PF Employee", detail.pfEmployee],
    ["ESI Employee", detail.esiEmployee],
    ["Prof. Tax", detail.professionalTax],
    ["TDS", detail.tds],
    ["Uniform", detail.uniformDeduction],
    ["Bank Advance", detail.bankAdvance],
    ["Cash Advance", detail.cashAdvance],
    ["Jify Advance", detail.jifyAdvance],
    ["Loan EMI", detail.loanEmi],
    ["Cash Loan EMI", detail.cashLoanEmi],
  ];

  const tableBody: TableCell[][] = [
    [
      tc({ text: "EARNINGS", fontSize: 9, bold: true, color: "#333333", colSpan: 2, border: [true, true, false, true], fillColor: "#eeeeee", margin: [4, 4, 4, 4] }),
      tc({}),
      tc({ text: "", border: [false, false, false, false] }),
      tc({ text: "DEDUCTIONS", fontSize: 9, bold: true, color: "#333333", colSpan: 2, border: [false, true, true, true], fillColor: "#eeeeee", margin: [4, 4, 4, 4] }),
      tc({}),
    ],
    ...earningsRows.map((er, i) => {
      const dr = deductionsRows[i];
      const [eLabel, eAmt] = er;
      const [dLabel, dAmt] = dr;
      return [
        ...earningCell(eLabel, eAmt),
        tc({ text: "", border: [false, false, false, false] }),
        ...deductionCell(dLabel, dAmt),
      ] as TableCell[];
    }),
    [
      tc({ text: "GROSS SALARY", fontSize: 9, bold: true, color: "#333333", border: [true, true, false, true], fillColor: "#f9f9f9", margin: [4, 4, 4, 4] }),
      tc({ text: inr(detail.grossSalary), fontSize: 9, bold: true, alignment: "right", color: "#cc7700", border: [false, true, false, true], fillColor: "#f9f9f9", margin: [4, 4, 4, 4] }),
      tc({ text: "", border: [false, false, false, false], fillColor: "#ffffff" }),
      tc({ text: "TOTAL DEDUCTIONS", fontSize: 9, bold: true, color: "#333333", border: [false, true, false, true], fillColor: "#f9f9f9", margin: [4, 4, 4, 4] }),
      tc({ text: inr(detail.totalDeductions), fontSize: 9, bold: true, alignment: "right", color: "#cc2200", border: [false, true, true, true], fillColor: "#f9f9f9", margin: [4, 4, 4, 4] }),
    ],
  ];

  const lastItem: Content = {
    text: "This is a computer-generated document. No signature required.",
    fontSize: 7,
    color: "#aaaaaa",
    italics: true,
    alignment: "center",
    margin: [0, 0, 0, 0],
  };

  if (pageBreak) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lastItem as any).pageBreak = "after";
  }

  const content: Content[] = [
    // ── Header ──
    {
      table: {
        widths: ["*"],
        body: [[tc({
          stack: [
            { text: entityName.toUpperCase(), fontSize: 14, bold: true, color: "#111111" },
            { text: `Salary Slip — ${month} ${year}`, fontSize: 10, color: "#555555", margin: [0, 2, 0, 0] },
          ],
          fillColor: "#f5f5f5",
          border: [false, false, false, true],
          margin: [8, 8, 8, 8],
        })]],
      },
      layout: { hLineColor: () => "#dddddd", vLineColor: () => "#dddddd" },
      margin: [0, 0, 0, 6],
    } as Content,

    // ── Employee Info ──
    {
      table: {
        widths: ["*", "*"],
        body: [[
          tc({
            stack: [
              infoItem("Employee Code", emp.employeeCode),
              infoItem("Name", emp.fullName),
              infoItem("Designation", emp.designation?.name ?? "N/A"),
              infoItem("Date of Joining", doj),
            ],
            margin: [6, 6, 6, 6],
          }),
          tc({
            stack: [
              infoItem("Department", emp.department?.name ?? "N/A"),
              infoItem("Location", emp.location ? `${emp.location.code} — ${emp.location.name}` : "N/A"),
              infoItem("Bank", bankDisplay(emp)),
              infoItem("Payable Days", String(detail.payableDays)),
            ],
            margin: [6, 6, 6, 6],
          }),
        ]],
      },
      layout: { hLineColor: () => "#dddddd", vLineColor: () => "#dddddd" },
      margin: [0, 0, 0, 6],
    } as Content,

    // ── Earnings / Deductions table ──
    {
      table: {
        widths: ["*", "auto", 8, "*", "auto"],
        body: tableBody,
      },
      layout: { hLineColor: () => "#dddddd", vLineColor: () => "#dddddd" },
      margin: [0, 0, 0, 6],
    } as Content,

    // ── Net Pay ──
    {
      table: {
        widths: ["*"],
        body: [[tc({
          stack: [
            { text: "NET PAY", fontSize: 9, bold: true, color: "#555555", alignment: "center" },
            { text: inr(detail.netSalary), fontSize: 18, bold: true, color: "#006600", alignment: "center", margin: [0, 2, 0, 2] },
            { text: numberToWords(detail.netSalary), fontSize: 8, italics: true, color: "#555555", alignment: "center" },
          ],
          fillColor: "#f0fff0",
          border: [true, true, true, true],
          margin: [8, 8, 8, 8],
        })]],
      },
      layout: { hLineColor: () => "#aaddaa", vLineColor: () => "#aaddaa" },
      margin: [0, 0, 0, 6],
    } as Content,

    // ── Employer Cost ──
    {
      table: {
        widths: ["auto", "auto", "auto", "auto", "auto", "auto", "auto", "*"],
        body: [[
          tc({ text: "Employer Cost:", fontSize: 8, bold: true, color: "#555555", border: [true, true, false, true], fillColor: "#f5f5f5", margin: [6, 4, 4, 4] }),
          tc({ text: "PF", fontSize: 8, color: "#888888", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [0, 4, 0, 4] }),
          tc({ text: inr(detail.pfEmployer), fontSize: 8, bold: true, color: "#333333", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [4, 4, 8, 4] }),
          tc({ text: "ESI", fontSize: 8, color: "#888888", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [0, 4, 0, 4] }),
          tc({ text: inr(detail.esiEmployer), fontSize: 8, bold: true, color: "#333333", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [4, 4, 8, 4] }),
          tc({ text: "Gratuity", fontSize: 8, color: "#888888", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [0, 4, 0, 4] }),
          tc({ text: inr(detail.gratuity), fontSize: 8, bold: true, color: "#333333", border: [false, true, false, true], fillColor: "#f5f5f5", margin: [4, 4, 8, 4] }),
          tc({ text: `CTC: ${inr(detail.ctc)}`, fontSize: 8, bold: true, color: "#0055cc", alignment: "right", border: [false, true, true, true], fillColor: "#f5f5f5", margin: [4, 4, 6, 4] }),
        ]],
      },
      layout: { hLineColor: () => "#dddddd", vLineColor: () => "#dddddd" },
      margin: [0, 0, 0, 6],
    } as Content,

    lastItem,
  ];

  return content;
}

// ── Public API ────────────────────────────────────────────────────────────────

function makePrinter() {
  // Browser build of pdfmake can be used server-side with vfs fonts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmake = require("pdfmake/build/pdfmake") as any;
  pdfmake.vfs = vfs;
  return pdfmake;
}

export async function generatePayslipPdf(
  detail: PayrollDetailWithEmployee,
  entityName: string,
  month: string,
  year: number
): Promise<Buffer> {
  const pdfmake = makePrinter();

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { font: "Roboto" },
    content: buildPayslipContent(detail, entityName, month, year, false),
  };

  return new Promise<Buffer>((resolve, reject) => {
    const pdfDoc = pdfmake.createPdf(docDef);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
    // timeout fallback
    setTimeout(() => reject(new Error("PDF generation timeout")), 30000);
  });
}

export async function generateBulkPayslipsPdf(
  details: PayrollDetailWithEmployee[],
  entityName: string,
  month: string,
  year: number
): Promise<Buffer> {
  const pdfmake = makePrinter();

  const allContent: Content[] = [];
  details.forEach((detail, idx) => {
    const isLast = idx === details.length - 1;
    const pages = buildPayslipContent(detail, entityName, month, year, !isLast);
    allContent.push(...pages);
  });

  const docDef: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { font: "Roboto" },
    content: allContent,
  };

  return new Promise<Buffer>((resolve, reject) => {
    const pdfDoc = pdfmake.createPdf(docDef);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
    setTimeout(() => reject(new Error("PDF generation timeout")), 60000);
  });
}
