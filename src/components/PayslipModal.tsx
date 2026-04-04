"use client";

import { X } from "lucide-react";

export interface PayslipDetail {
  id: string;
  salary: number;
  payableDays: number;
  workedDays: number;
  otDays: number;
  leaveEncashDays: number;
  labourHoliday: number;
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
    department: { name: string } | null;
    location: { code: string; name: string } | null;
  };
}

interface Props {
  detail: PayslipDetail;
  month: number;
  year: number;
  entityName: string;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function r(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function Row({ label, value, red }: { label: string; value: number; red?: boolean }) {
  return (
    <tr>
      <td style={{ padding: "5px 0", fontSize: 12, color: "var(--text-3)", width: "55%" }}>{label}</td>
      <td style={{ padding: "5px 0", fontSize: 12, textAlign: "right", color: red ? "var(--red)" : "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
        {value === 0 ? "—" : value.toLocaleString("en-IN")}
      </td>
    </tr>
  );
}

export function PayslipModal({ detail, month, year, entityName, onClose }: Props) {
  const emp = detail.employee;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius)",
          width: "100%", maxWidth: 680,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                PAYSLIP — {MONTHS[month - 1].toUpperCase()} {year}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                {emp.fullName}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>Code: <strong style={{ color: "var(--text-2)" }}>{emp.employeeCode}</strong></span>
                {emp.department && <span>Dept: <strong style={{ color: "var(--text-2)" }}>{emp.department.name}</strong></span>}
                {emp.location && <span>Location: <strong style={{ color: "var(--text-2)" }}>{emp.location.code}</strong></span>}
                <span>Entity: <strong style={{ color: "var(--text-2)" }}>{entityName}</strong></span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--glass)", border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-xs)", padding: "6px 8px",
                color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center",
                flexShrink: 0, marginLeft: 12,
              }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Summary strip */}
          <div style={{ display: "flex", gap: 20, marginTop: 14, padding: "10px 14px", background: "var(--glass)", borderRadius: "var(--radius-xs)", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Monthly Salary</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{r(detail.salary)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Payable Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{detail.payableDays}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Worked Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{detail.workedDays}</div>
            </div>
            {detail.leaveEncashDays > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Leave Encash</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>{detail.leaveEncashDays} days</div>
              </div>
            )}
          </div>
        </div>

        {/* Earnings / Deductions side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {/* Earnings */}
          <div style={{ padding: "16px 20px", borderRight: "1px solid var(--glass-border)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Earnings</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <Row label="Earned Basic" value={detail.earnedBasic} />
                <Row label="Earned HRA" value={detail.earnedHra} />
                <Row label="Earned Special" value={detail.earnedSpecial} />
                <Row label="Earned OT" value={detail.earnedOt} />
                <Row label="Leave Encashment" value={detail.earnedLeave} />
                <Row label="Labour Holiday" value={detail.earnedLabour} />
                <Row label="Earned TA" value={detail.earnedTa} />
                <Row label="Salary Arrears" value={detail.salaryArrears} />
              </tbody>
            </table>
            <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>GROSS</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--amber)" }}>{r(detail.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Deductions</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <Row label="PF Employee" value={detail.pfEmployee} red />
                <Row label="ESI Employee" value={detail.esiEmployee} red />
                <Row label="Prof. Tax" value={detail.professionalTax} red />
                <Row label="TDS" value={detail.tds} red />
                <Row label="Uniform" value={detail.uniformDeduction} red />
                <Row label="Bank Advance" value={detail.bankAdvance} red />
                <Row label="Cash Advance" value={detail.cashAdvance} red />
                <Row label="Jify Advance" value={detail.jifyAdvance} red />
                <Row label="Loan EMI" value={detail.loanEmi} red />
                <Row label="Cash Loan EMI" value={detail.cashLoanEmi} red />
              </tbody>
            </table>
            <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>TOTAL DED</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--red)" }}>{r(detail.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{ borderTop: "2px solid var(--glass-border)", padding: "16px 24px", textAlign: "center", background: "rgba(52,199,89,0.04)" }}>
          <div style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net Pay</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)" }}>{r(detail.netSalary)}</div>
        </div>

        {/* Employer Cost */}
        <div style={{ borderTop: "1px solid var(--glass-border)", padding: "14px 24px", background: "var(--glass)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Employer Cost</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>PF Employer: </span>
              <strong style={{ color: "var(--text-2)" }}>{r(detail.pfEmployer)}</strong>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>ESI Employer: </span>
              <strong style={{ color: "var(--text-2)" }}>{r(detail.esiEmployer)}</strong>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>Gratuity: </span>
              <strong style={{ color: "var(--text-2)" }}>{r(detail.gratuity)}</strong>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>CTC: </span>
              <strong style={{ color: "var(--blue)" }}>{r(detail.ctc)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
