import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

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

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── PDF Drawing Helpers ──────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M_LEFT = 30;
const M_RIGHT = 30;
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;
const COL_MID = M_LEFT + CONTENT_W / 2;
const RIGHT_EDGE = PAGE_W - M_RIGHT;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.33, 0.33, 0.33);
const LIGHT_GRAY = rgb(0.53, 0.53, 0.53);
const MUTED = rgb(0.67, 0.67, 0.67);
const RED = rgb(0.8, 0.13, 0);
const GREEN = rgb(0, 0.4, 0);
const AMBER = rgb(0.8, 0.47, 0);
const BLUE = rgb(0, 0.33, 0.8);
const BG_LIGHT = rgb(0.96, 0.96, 0.96);
const BG_GREEN = rgb(0.94, 1, 0.94);
const LINE_COLOR = rgb(0.82, 0.82, 0.82);

function drawTextRight(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont, color = BLACK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x - w, y, size, font, color });
}

function drawTextCenter(page: PDFPage, text: string, centerX: number, y: number, size: number, font: PDFFont, color = BLACK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - w / 2, y, size, font, color });
}

function hLine(page: PDFPage, y: number, x1 = M_LEFT, x2 = RIGHT_EDGE) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: LINE_COLOR });
}

// ── Payslip on a page ────────────────────────────────────────────────────────

async function drawPayslipOnPage(
  pdfDoc: PDFDocument,
  detail: PayrollDetailWithEmployee,
  entityName: string,
  month: string,
  year: number
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const emp = detail.employee;
  let y = PAGE_H - 40;

  // ── Header background ──
  page.drawRectangle({ x: M_LEFT, y: y - 8, width: CONTENT_W, height: 42, color: BG_LIGHT });
  page.drawText(entityName.toUpperCase(), { x: M_LEFT + 10, y: y + 12, size: 14, font: fontBold, color: BLACK });
  page.drawText(`Salary Slip — ${month} ${year}`, { x: M_LEFT + 10, y: y - 4, size: 10, font, color: LIGHT_GRAY });
  hLine(page, y - 8);
  y -= 22;

  // ── Employee Info — Two columns ──
  y -= 16;
  const infoLeft = M_LEFT + 10;
  const infoRight = COL_MID + 10;

  function infoRow(label: string, value: string, x: number, yPos: number): number {
    page.drawText(label, { x, y: yPos, size: 7, font, color: MUTED });
    page.drawText(value, { x, y: yPos - 11, size: 9, font: fontBold, color: GRAY });
    return yPos - 26;
  }

  let yL = y;
  let yR = y;
  yL = infoRow("Employee Code", emp.employeeCode, infoLeft, yL);
  yR = infoRow("Department", emp.department?.name ?? "N/A", infoRight, yR);
  yL = infoRow("Name", emp.fullName, infoLeft, yL);
  yR = infoRow("Location", emp.location ? `${emp.location.code} — ${emp.location.name}` : "N/A", infoRight, yR);
  yL = infoRow("Designation", emp.designation?.name ?? "N/A", infoLeft, yL);
  yR = infoRow("Bank", bankDisplay(emp), infoRight, yR);
  yL = infoRow("Date of Joining", formatDate(emp.dateOfJoining), infoLeft, yL);
  yR = infoRow("Payable Days", String(detail.payableDays), infoRight, yR);

  y = Math.min(yL, yR) - 4;
  // vertical divider
  page.drawLine({ start: { x: COL_MID, y: y + 108 }, end: { x: COL_MID, y }, thickness: 0.5, color: LINE_COLOR });
  hLine(page, y);

  // ── Earnings / Deductions header ──
  y -= 4;
  page.drawRectangle({ x: M_LEFT, y: y - 14, width: CONTENT_W, height: 18, color: BG_LIGHT });
  page.drawText("EARNINGS", { x: M_LEFT + 10, y: y - 10, size: 9, font: fontBold, color: GRAY });
  page.drawText("DEDUCTIONS", { x: COL_MID + 10, y: y - 10, size: 9, font: fontBold, color: GRAY });
  y -= 18;
  hLine(page, y);

  // ── Earnings rows ──
  const earningsData: [string, number][] = [
    ["Earned Basic", detail.earnedBasic],
    ["Earned HRA", detail.earnedHra],
    ["Earned Special", detail.earnedSpecial],
    ["Earned OT", detail.earnedOt],
    ["Leave Encashment", detail.earnedLeave],
    ["Labour Holiday", detail.earnedLabour],
    ["Earned TA", detail.earnedTa],
    ["Salary Arrears", detail.salaryArrears],
  ];
  const deductionsData: [string, number][] = [
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

  const maxRows = Math.max(earningsData.length, deductionsData.length);
  const rowH = 16;

  for (let i = 0; i < maxRows; i++) {
    y -= rowH;
    if (i < earningsData.length) {
      const [label, amt] = earningsData[i];
      page.drawText(label, { x: M_LEFT + 10, y, size: 9, font, color: rgb(0.27, 0.27, 0.27) });
      drawTextRight(page, amt > 0 ? inr(amt) : "—", COL_MID - 10, y, 9, font, amt > 0 ? BLACK : MUTED);
    }
    if (i < deductionsData.length) {
      const [label, amt] = deductionsData[i];
      page.drawText(label, { x: COL_MID + 10, y, size: 9, font, color: rgb(0.27, 0.27, 0.27) });
      drawTextRight(page, amt > 0 ? inr(amt) : "—", RIGHT_EDGE - 10, y, 9, font, amt > 0 ? RED : MUTED);
    }
  }

  // vertical divider through table
  page.drawLine({ start: { x: COL_MID, y: y + maxRows * rowH }, end: { x: COL_MID, y: y - 4 }, thickness: 0.5, color: LINE_COLOR });

  y -= 8;
  hLine(page, y);

  // ── Gross / Total Deductions ──
  y -= 4;
  page.drawRectangle({ x: M_LEFT, y: y - 16, width: CONTENT_W, height: 20, color: BG_LIGHT });
  page.drawText("GROSS SALARY", { x: M_LEFT + 10, y: y - 12, size: 9, font: fontBold, color: GRAY });
  drawTextRight(page, inr(detail.grossSalary), COL_MID - 10, y - 12, 9, fontBold, AMBER);
  page.drawText("TOTAL DEDUCTIONS", { x: COL_MID + 10, y: y - 12, size: 9, font: fontBold, color: GRAY });
  drawTextRight(page, inr(detail.totalDeductions), RIGHT_EDGE - 10, y - 12, 9, fontBold, RED);
  y -= 20;
  hLine(page, y);

  // ── Net Pay ──
  y -= 4;
  const netH = 54;
  page.drawRectangle({ x: M_LEFT, y: y - netH, width: CONTENT_W, height: netH, color: BG_GREEN });
  const netCenterX = M_LEFT + CONTENT_W / 2;
  drawTextCenter(page, "NET PAY", netCenterX, y - 12, 9, fontBold, LIGHT_GRAY);
  drawTextCenter(page, inr(detail.netSalary), netCenterX, y - 30, 18, fontBold, GREEN);
  drawTextCenter(page, numberToWords(detail.netSalary), netCenterX, y - 44, 7, fontItalic, LIGHT_GRAY);
  y -= netH;
  hLine(page, y);

  // ── Employer Cost ──
  y -= 4;
  page.drawRectangle({ x: M_LEFT, y: y - 18, width: CONTENT_W, height: 18, color: BG_LIGHT });
  let costX = M_LEFT + 10;
  page.drawText("Employer Cost:", { x: costX, y: y - 13, size: 8, font: fontBold, color: LIGHT_GRAY });
  costX += 78;
  page.drawText(`PF ${inr(detail.pfEmployer)}`, { x: costX, y: y - 13, size: 8, font, color: GRAY });
  costX += 90;
  page.drawText(`ESI ${inr(detail.esiEmployer)}`, { x: costX, y: y - 13, size: 8, font, color: GRAY });
  costX += 80;
  page.drawText(`Gratuity ${inr(detail.gratuity)}`, { x: costX, y: y - 13, size: 8, font, color: GRAY });
  drawTextRight(page, `CTC: ${inr(detail.ctc)}`, RIGHT_EDGE - 10, y - 13, 8, fontBold, BLUE);
  y -= 22;
  hLine(page, y);

  // ── Footer ──
  y -= 14;
  drawTextCenter(page, "This is a computer-generated document. No signature required.", netCenterX, y, 7, fontItalic, MUTED);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePayslipPdf(
  detail: PayrollDetailWithEmployee,
  entityName: string,
  month: string,
  year: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  await drawPayslipOnPage(pdfDoc, detail, entityName, month, year);
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateBulkPayslipsPdf(
  details: PayrollDetailWithEmployee[],
  entityName: string,
  month: string,
  year: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  for (const detail of details) {
    await drawPayslipOnPage(pdfDoc, detail, entityName, month, year);
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
