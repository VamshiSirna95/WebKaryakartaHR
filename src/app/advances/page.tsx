"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, CreditCard, Landmark, TrendingDown, Plus } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { AdvanceModal } from "@/components/AdvanceModal";
import { LoanModal } from "@/components/LoanModal";
import { AdvanceHistoryModal } from "@/components/AdvanceHistoryModal";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Tab = "advances" | "loans" | "outstanding";

interface Entity { id: string; code: string; name: string; }

interface AdvanceSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  bankAdvance: number;
  cashAdvance: number;
  jifyAdvance: number;
  loanEmi: number;
  cashLoanEmi: number;
  totalDeductions: number;
}

interface AdvanceEntry {
  id: string;
  employeeId: string;
  type: string;
  amount: number;
  month: number;
  year: number;
  date: string | null;
  remarks: string | null;
}

interface LoanAccount {
  id: string;
  employeeId: string;
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
  employee: {
    employeeCode: string;
    fullName: string;
    department: { name: string } | null;
  };
}

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--glass)", border: "1px solid var(--glass-border)",
  color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
  transition: "var(--transition)",
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--blue)", border: "none", color: "#fff",
  fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "var(--transition)",
};

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtRupee(n: number) { return "\u20B9" + n.toLocaleString("en-IN"); }

function AmtCell({ value, red }: { value: number; red?: boolean }) {
  return (
    <td style={{
      padding: "9px 12px", fontSize: 12, textAlign: "right", whiteSpace: "nowrap",
      borderBottom: "1px solid var(--glass-border)",
      color: value === 0 ? "var(--text-4)" : red ? "var(--red)" : "var(--amber)",
      fontWeight: value > 0 ? 600 : 400,
    }}>
      {value === 0 ? "0" : fmt(value)}
    </td>
  );
}

const thBase: React.CSSProperties = {
  padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)",
};
const tdBase: React.CSSProperties = {
  padding: "9px 12px", fontSize: 12, color: "var(--text-2)",
  borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap",
};

const LOAN_TYPE_LABEL: Record<string, string> = {
  EMPLOYEE_LOAN: "Employee Loan",
  CASH_LOAN: "Cash Loan",
};

export default function AdvancesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("advances");
  const [summary, setSummary] = useState<AdvanceSummary[]>([]);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [outstanding, setOutstanding] = useState<LoanAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loansLoading, setLoansLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [editEntry, setEditEntry] = useState<AdvanceEntry | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[] }) => {
        setEntities(opts.entities ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchSummary = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    const p = new URLSearchParams({ entityId, month: String(month), year: String(year) });
    fetch(`/api/advances/summary?${p}`)
      .then((r) => r.json())
      .then((data: AdvanceSummary[]) => { setSummary(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entityId, month, year]);

  const fetchLoans = useCallback(() => {
    if (!entityId) return;
    setLoansLoading(true);
    fetch(`/api/loans?entityId=${entityId}`)
      .then((r) => r.json())
      .then((data: LoanAccount[]) => { setLoans(data ?? []); setLoansLoading(false); })
      .catch(() => setLoansLoading(false));
  }, [entityId]);

  const fetchOutstanding = useCallback(() => {
    if (!entityId) return;
    setOutstandingLoading(true);
    fetch(`/api/advances/outstanding?entityId=${entityId}`)
      .then((r) => r.json())
      .then((data: LoanAccount[]) => { setOutstanding(data ?? []); setOutstandingLoading(false); })
      .catch(() => setOutstandingLoading(false));
  }, [entityId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchLoans(); }, [fetchLoans]);
  useEffect(() => { fetchOutstanding(); }, [fetchOutstanding]);

  async function handleCloseLoan(loanId: string) {
    if (!confirm("Close this loan account? The EMI will no longer be deducted.")) return;
    await fetch(`/api/loans/${loanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    fetchLoans();
    fetchOutstanding();
  }

  // Metrics
  const totalBank = summary.reduce((a, s) => a + s.bankAdvance, 0);
  const totalCash = summary.reduce((a, s) => a + s.cashAdvance, 0);
  const totalJify = summary.reduce((a, s) => a + s.jifyAdvance, 0);
  const totalLoans = summary.reduce((a, s) => a + s.loanEmi + s.cashLoanEmi, 0);

  const totals = summary.reduce(
    (a, s) => ({
      bank: a.bank + s.bankAdvance,
      cash: a.cash + s.cashAdvance,
      jify: a.jify + s.jifyAdvance,
      loanEmi: a.loanEmi + s.loanEmi,
      cashLoanEmi: a.cashLoanEmi + s.cashLoanEmi,
      total: a.total + s.totalDeductions,
    }),
    { bank: 0, cash: 0, jify: 0, loanEmi: 0, cashLoanEmi: 0, total: 0 }
  );

  const totalOutstandingAmt = outstanding.reduce((a, l) => a + l.outstandingBalance, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: "advances", label: "Monthly Advances" },
    { id: "loans", label: "Loans" },
    { id: "outstanding", label: "Outstanding Report" },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Advances &amp; Loans</h1>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.code} \u2014 {e.name}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard color="amber" icon={<Landmark size={16} />} value={fmtRupee(totalBank)} label="Bank Advances" />
        <MetricCard color="amber" icon={<Wallet size={16} />} value={fmtRupee(totalCash)} label="Cash Advances" />
        <MetricCard color="amber" icon={<CreditCard size={16} />} value={fmtRupee(totalJify)} label="Jify Advances" />
        <MetricCard color="red" icon={<TrendingDown size={16} />} value={fmtRupee(totalLoans)} label="Loan EMIs" />
      </div>

      {/* Tabs + action buttons */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: "flex", flex: 1 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "10px 16px", fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--blue)" : "var(--text-3)",
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid var(--blue)" : "2px solid transparent",
                marginBottom: -1, transition: "var(--transition)",
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {activeTab === "loans" && (
            <button
              onClick={() => setShowLoanModal(true)}
              style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
            >
              <Plus size={14} />
              Issue Loan
            </button>
          )}
          {activeTab === "advances" && (
            <button
              onClick={() => { setEditEntry(null); setShowAdvanceModal(true); }}
              style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
            >
              <Plus size={14} />
              Add Advance
            </button>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="glass-card" style={{ overflow: "hidden", borderRadius: "0 0 var(--radius) var(--radius)" }}>

        {/* Monthly Advances tab */}
        {activeTab === "advances" && (
          loading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading\u2026</div>
          ) : summary.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
              No advance entries for {MONTHS[month - 1]} {year}. Click \u201cAdd Advance\u201d to add one.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thBase, textAlign: "left" }}>Code</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Name</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Dept</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--amber)" }}>Bank Adv</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--amber)" }}>Cash Adv</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--amber)" }}>Jify Adv</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--red)" }}>Loan EMI</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--red)" }}>Cash Loan</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--text-1)" }}>Total</th>
                    <th style={{ ...thBase, textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.employeeId}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{s.employeeCode}</td>
                      <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{s.employeeName}</td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{s.departmentName || "\u2014"}</td>
                      <AmtCell value={s.bankAdvance} />
                      <AmtCell value={s.cashAdvance} />
                      <AmtCell value={s.jifyAdvance} />
                      <AmtCell value={s.loanEmi} red />
                      <AmtCell value={s.cashLoanEmi} red />
                      <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>
                        {fmt(s.totalDeductions)}
                      </td>
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <span
                          style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer", textDecoration: "underline", marginRight: 10 }}
                          onClick={() => {
                            const synthetic: AdvanceEntry = {
                              id: "",
                              employeeId: s.employeeId,
                              type: "BANK_ADVANCE",
                              amount: 0,
                              month, year,
                              date: null,
                              remarks: null,
                            };
                            setEditEntry(synthetic);
                            setShowAdvanceModal(true);
                          }}
                        >
                          Edit
                        </span>
                        <span
                          style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => setHistoryEmployeeId(s.employeeId)}
                        >
                          History
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={3} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
                      TOTALS ({summary.length} employees)
                    </td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.bank)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.cash)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.jify)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.loanEmi)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.cashLoanEmi)}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.total)}</td>
                    <td style={{ ...tdBase, borderTop: "2px solid var(--glass-border)" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}

        {/* Loans tab */}
        {activeTab === "loans" && (
          loansLoading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading\u2026</div>
          ) : loans.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
              No loan accounts found. Click \u201cIssue Loan\u201d to create one.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thBase, textAlign: "left" }}>Code</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Name</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Loan Type</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Principal</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Monthly EMI</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Total Paid</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--red)" }}>Outstanding</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Status</th>
                    <th style={{ ...thBase, textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const isActive = loan.status === "ACTIVE";
                    return (
                      <tr key={loan.id}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{loan.employee.employeeCode}</td>
                        <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{loan.employee.fullName}</td>
                        <td style={{ ...tdBase, color: "var(--text-2)" }}>{LOAN_TYPE_LABEL[loan.loanType] ?? loan.loanType}</td>
                        <td style={{ ...tdBase, textAlign: "right" }}>{fmt(loan.principalAmount)}</td>
                        <td style={{ ...tdBase, textAlign: "right", color: "var(--amber)" }}>{fmt(loan.emiAmount)}</td>
                        <td style={{ ...tdBase, textAlign: "right" }}>{fmt(loan.totalPaid)}</td>
                        <td style={{ ...tdBase, textAlign: "right", color: "var(--red)", fontWeight: 600 }}>{fmt(loan.outstandingBalance)}</td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                            background: isActive ? "var(--green-bg)" : "var(--glass)",
                            color: isActive ? "var(--green)" : "var(--text-4)",
                          }}>
                            {isActive ? "Active" : "Closed"}
                          </span>
                        </td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          <span
                            style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer", textDecoration: "underline", marginRight: isActive ? 10 : 0 }}
                            onClick={() => setHistoryEmployeeId(loan.employeeId)}
                          >
                            History
                          </span>
                          {isActive && (
                            <span
                              style={{ fontSize: 11, color: "var(--red)", cursor: "pointer", textDecoration: "underline" }}
                              onClick={() => handleCloseLoan(loan.id)}
                            >
                              Close
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Outstanding Report tab */}
        {activeTab === "outstanding" && (
          outstandingLoading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading\u2026</div>
          ) : outstanding.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
              No active loans with outstanding balances.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {/* Summary banner */}
              <div style={{ padding: "12px 20px", background: "var(--red-bg)", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 32, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Active Loans</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{outstanding.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Outstanding</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{fmtRupee(totalOutstandingAmt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Monthly EMI Burden</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--amber)" }}>{fmtRupee(outstanding.reduce((a, l) => a + l.emiAmount, 0))}</div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thBase, textAlign: "left" }}>Code</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Name</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Dept</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Loan Type</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Principal</th>
                    <th style={{ ...thBase, textAlign: "right" }}>EMI / mo</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Paid</th>
                    <th style={{ ...thBase, textAlign: "right", color: "var(--red)" }}>Outstanding</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Started</th>
                    <th style={{ ...thBase, textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((loan) => (
                    <tr key={loan.id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{loan.employee.employeeCode}</td>
                      <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{loan.employee.fullName}</td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{loan.employee.department?.name || "\u2014"}</td>
                      <td style={{ ...tdBase }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                          background: loan.loanType === "EMPLOYEE_LOAN" ? "var(--blue-bg, var(--glass))" : "var(--amber-bg)",
                          color: loan.loanType === "EMPLOYEE_LOAN" ? "var(--blue)" : "var(--amber)",
                        }}>
                          {LOAN_TYPE_LABEL[loan.loanType] ?? loan.loanType}
                        </span>
                      </td>
                      <td style={{ ...tdBase, textAlign: "right" }}>{fmt(loan.principalAmount)}</td>
                      <td style={{ ...tdBase, textAlign: "right", color: "var(--amber)" }}>{fmt(loan.emiAmount)}</td>
                      <td style={{ ...tdBase, textAlign: "right", color: "var(--green)" }}>{fmt(loan.totalPaid)}</td>
                      <td style={{ ...tdBase, textAlign: "right", color: "var(--red)", fontWeight: 700 }}>{fmt(loan.outstandingBalance)}</td>
                      <td style={{ ...tdBase, textAlign: "right", color: "var(--text-3)" }}>{MONTHS[loan.startMonth - 1].slice(0, 3)} {loan.startYear}</td>
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <span
                          style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => setHistoryEmployeeId(loan.employeeId)}
                        >
                          History
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={4} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
                      TOTALS ({outstanding.length} active loans)
                    </td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(outstanding.reduce((a, l) => a + l.principalAmount, 0))}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(outstanding.reduce((a, l) => a + l.emiAmount, 0))}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--green)", borderTop: "2px solid var(--glass-border)" }}>{fmt(outstanding.reduce((a, l) => a + l.totalPaid, 0))}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totalOutstandingAmt)}</td>
                    <td colSpan={2} style={{ ...tdBase, borderTop: "2px solid var(--glass-border)" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>

      {/* Advance Modal */}
      {showAdvanceModal && (
        <AdvanceModal
          month={month}
          year={year}
          entityId={entityId}
          editEntry={editEntry?.id ? editEntry : null}
          onClose={() => { setShowAdvanceModal(false); setEditEntry(null); }}
          onSaved={() => { fetchSummary(); }}
        />
      )}

      {/* Loan Modal */}
      {showLoanModal && (
        <LoanModal
          entityId={entityId}
          defaultMonth={month}
          defaultYear={year}
          onClose={() => setShowLoanModal(false)}
          onSaved={() => { fetchLoans(); fetchOutstanding(); }}
        />
      )}

      {/* Advance History Modal */}
      {historyEmployeeId && (
        <AdvanceHistoryModal
          employeeId={historyEmployeeId}
          onClose={() => setHistoryEmployeeId(null)}
        />
      )}
    </div>
  );
}
