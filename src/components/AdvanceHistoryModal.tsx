"use client";

import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ADVANCE_TYPE_LABEL: Record<string, string> = {
  BANK_ADVANCE: "Bank Advance",
  CASH_ADVANCE: "Cash Advance",
  JIFY_ADVANCE: "Jify Advance",
  LOAN_EMI: "Loan EMI",
  CASH_LOAN_EMI: "Cash Loan EMI",
};

const LOAN_TYPE_LABEL: Record<string, string> = {
  EMPLOYEE_LOAN: "Employee Loan",
  CASH_LOAN: "Cash Loan",
};

interface AdvanceEntry {
  id: string;
  type: string;
  amount: number;
  month: number;
  year: number;
  date: string | null;
  remarks: string | null;
  createdAt: string;
}

interface LoanAccount {
  id: string;
  loanType: string;
  principalAmount: number;
  emiAmount: number;
  tenure: number;
  startMonth: number;
  startYear: number;
  totalPaid: number;
  outstandingBalance: number;
  status: string;
  remarks: string | null;
}

interface HistoryData {
  employee: { employeeCode: string; fullName: string; department: { name: string } | null };
  advances: AdvanceEntry[];
  loans: LoanAccount[];
}

interface Props {
  employeeId: string;
  onClose: () => void;
}

function r(n: number) { return "\u20B9" + n.toLocaleString("en-IN"); }

export function AdvanceHistoryModal({ employeeId, onClose }: Props) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/advances/history?employeeId=${employeeId}`)
      .then((res) => res.json())
      .then((d: HistoryData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const totalAdvancesGiven = data?.advances
    .filter((a) => ["BANK_ADVANCE", "CASH_ADVANCE", "JIFY_ADVANCE"].includes(a.type))
    .reduce((s, a) => s + a.amount, 0) ?? 0;

  const totalLoanEmiPaid = data?.loans.reduce((s, l) => s + l.totalPaid, 0) ?? 0;
  const totalOutstanding = data?.loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((s, l) => s + l.outstandingBalance, 0) ?? 0;

  const thStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
    textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
    borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", textAlign: "left",
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: 12, color: "var(--text-2)",
    borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: "100%", maxWidth: 800, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Clock size={16} style={{ color: "var(--blue)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Advance History</div>
            {data && (
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                {data.employee.fullName}
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-3)", fontWeight: 400, marginLeft: 8 }}>({data.employee.employeeCode})</span>
                {data.employee.department && <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: 8 }}>{data.employee.department.name}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", padding: "5px 7px", color: "var(--text-3)", cursor: "pointer", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading\u2026</div>
        ) : !data ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>No data found.</div>
        ) : (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "16px 20px" }}>
              {[
                { label: "Total Advances Given", value: totalAdvancesGiven, color: "var(--amber)", bg: "var(--amber-bg)" },
                { label: "Total Loan EMI Paid", value: totalLoanEmiPaid, color: "var(--red)", bg: "var(--red-bg)" },
                { label: "Outstanding Loans", value: totalOutstanding, color: "var(--red)", bg: "var(--red-bg)" },
              ].map((card) => (
                <div key={card.label} style={{ padding: "12px 16px", background: card.bg, borderRadius: "var(--radius-xs)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{r(card.value)}</div>
                </div>
              ))}
            </div>

            {/* Advance history */}
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Advance History</div>
              {data.advances.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-4)", padding: "12px 0" }}>No advances recorded.</div>
              ) : (
                <div style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Month / Year</th>
                        <th style={thStyle}>Type</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.advances.map((a) => (
                        <tr key={a.id}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{MONTHS[a.month - 1]} {a.year}</td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                              background: ["LOAN_EMI", "CASH_LOAN_EMI"].includes(a.type) ? "var(--red-bg)" : "var(--amber-bg)",
                              color: ["LOAN_EMI", "CASH_LOAN_EMI"].includes(a.type) ? "var(--red)" : "var(--amber)",
                            }}>
                              {ADVANCE_TYPE_LABEL[a.type] ?? a.type}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-1)", fontWeight: 600 }}>{r(a.amount)}</td>
                          <td style={{ ...tdStyle, color: "var(--text-3)" }}>
                            {a.date ? new Date(a.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014"}
                          </td>
                          <td style={{ ...tdStyle, color: "var(--text-3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{a.remarks || "\u2014"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active Loans */}
            <div style={{ padding: "12px 20px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Loan Accounts</div>
              {data.loans.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-4)", padding: "12px 0" }}>No loans recorded.</div>
              ) : (
                <div style={{ border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Loan Type</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Principal</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>EMI</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Tenure</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
                        <th style={{ ...thStyle, textAlign: "right", color: "var(--red)" }}>Outstanding</th>
                        <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.loans.map((loan) => {
                        const isActive = loan.status === "ACTIVE";
                        return (
                          <tr key={loan.id}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 500 }}>{LOAN_TYPE_LABEL[loan.loanType] ?? loan.loanType}</div>
                              <div style={{ fontSize: 10, color: "var(--text-4)" }}>Started: {MONTHS[loan.startMonth - 1]} {loan.startYear}</div>
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{r(loan.principalAmount)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "var(--amber)" }}>{r(loan.emiAmount)}</td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{loan.tenure}m</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "var(--green)" }}>{r(loan.totalPaid)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: isActive ? "var(--red)" : "var(--text-4)", fontWeight: isActive ? 600 : 400 }}>
                              {isActive ? r(loan.outstandingBalance) : "\u2014"}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                                background: isActive ? "var(--green-bg)" : "var(--glass)",
                                color: isActive ? "var(--green)" : "var(--text-4)",
                              }}>
                                {isActive ? "Active" : "Closed"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
