"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import DeclarationModal from "@/components/DeclarationModal";

type Tab = "pf" | "esi" | "pt" | "tds" | "tracker";
type TdsSubView = "register" | "declarations";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Entity { id: string; code: string; name: string; pfCode?: string | null; esiCode?: string | null; ptCode?: string | null; }

interface PayrollDetail {
  id: string;
  grossSalary: number;
  earnedBasic: number;
  workedDays: number;
  payableDays: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  employee: {
    employeeCode: string;
    fullName: string;
    uanNumber: string | null;
    esiNumber: string | null;
    department: { name: string } | null;
  };
}

interface ComplianceFiling {
  id: string;
  type: string;
  month: number;
  year: number;
  dueDate: string;
  status: string;
  filedAt: string | null;
  referenceNo: string | null;
  amount: number | null;
  remarks: string | null;
}

interface TdsDetail {
  id: string;
  employeeCode: string;
  fullName: string;
  panNumber: string | null;
  grossSalary: number;
  tds: number;
  ytdTds: number;
}

interface TdsSummaryMonth {
  month: number;
  monthName: string;
  year: number;
  totalTds: number;
  employeeCount: number;
  challanStatus: string | null;
}

interface InvestmentDeclaration {
  id: string;
  employeeId: string;
  financialYear: string;
  regime: string;
  sec80C_ppf: number;
  sec80C_elss: number;
  sec80C_lic: number;
  sec80C_nsc: number;
  sec80C_tuition: number;
  sec80C_homeLoan: number;
  sec80C_fd: number;
  sec80C_sukanya: number;
  sec80C_other: number;
  sec80D_self: number;
  sec80D_parents: number;
  sec24_homeLoanInterest: number;
  sec80E_eduLoan: number;
  sec80G_donation: number;
  nps_80CCD: number;
  hraRentPaid: number;
  hraMetro: boolean;
  total80C: number;
  totalDeductions: number;
  status: string;
  employee: {
    employeeCode: string;
    fullName: string;
    department: { name: string } | null;
  };
}

interface TdsProjection {
  annualGross: number;
  standardDeduction: number;
  professionalTax: number;
  sec80C: number;
  sec80D: number;
  sec24: number;
  otherDeductions: number;
  hraExemption: number;
  totalExemptions: number;
  taxableIncome: number;
  taxOldRegime: number;
  taxNewRegime: number;
  selectedRegime: string;
  applicableTax: number;
  monthlyTds: number;
  tdsPaidYtd: number;
  tdsRemaining: number;
  monthsRemaining: number;
}

interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

// ── Styles ────────────────────────────────────────────────────────────────────

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--glass)", border: "1px solid var(--glass-border)",
  color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--blue)", border: "none",
  color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const btnGreen: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--green-bg)", border: "1px solid var(--glass-border)",
  color: "var(--green)", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const thBase: React.CSSProperties = {
  padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", textAlign: "left",
};
const thR: React.CSSProperties = { ...thBase, textAlign: "right" };
const tdBase: React.CSSProperties = {
  padding: "9px 12px", fontSize: 12, color: "var(--text-2)",
  borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap",
};
const tdR: React.CSSProperties = { ...tdBase, textAlign: "right" };

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

// ── Mark Filed Modal ──────────────────────────────────────────────────────────

function MarkFiledModal({
  type, month, year, defaultAmount, onClose, onFiled,
}: { type: string; month: number; year: number; defaultAmount: number; onClose: () => void; onFiled: () => void; }) {
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState(String(Math.round(defaultAmount)));
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const entityId = (typeof window !== "undefined" ? sessionStorage.getItem("complianceEntityId") : null) ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, type, month, year, referenceNo: ref, amount: parseFloat(amount) || 0, remarks }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; alert(d.error ?? "Failed"); return; }
      onFiled();
      onClose();
    } catch { alert("Network error"); } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: "var(--radius-xs)",
    background: "var(--bg-2)", border: "1px solid var(--glass-border)",
    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", marginBottom: 16 }}>Mark {type} as Filed — {MONTHS[month - 1]} {year}</div>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Reference / Challan No</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)} style={inputStyle} placeholder="e.g. ECR-2026-03-001" required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={inputStyle} placeholder="Optional" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnGreen, opacity: loading ? 0.7 : 1 }}>{loading ? "Saving…" : "Mark as Filed"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const now = new Date();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [activeTab, setActiveTab] = useState<Tab>("pf");
  const [details, setDetails] = useState<PayrollDetail[]>([]);
  const [filings, setFilings] = useState<ComplianceFiling[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEsiAll, setShowEsiAll] = useState(false);

  const [markFiled, setMarkFiled] = useState<{ type: string; amount: number } | null>(null);

  // TDS state
  const [tdsSubView, setTdsSubView] = useState<TdsSubView>("register");
  const [tdsDetails, setTdsDetails] = useState<TdsDetail[]>([]);
  const [tdsTotals, setTdsTotals] = useState({ grossSalary: 0, tds: 0, ytdTds: 0 });
  const [tdsSummary, setTdsSummary] = useState<TdsSummaryMonth[]>([]);
  const [tdsFyTotal, setTdsFyTotal] = useState(0);
  const [declarations, setDeclarations] = useState<InvestmentDeclaration[]>([]);
  const [tdsLoading, setTdsLoading] = useState(false);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [editDeclaration, setEditDeclaration] = useState<InvestmentDeclaration | null>(null);
  const [projectionData, setProjectionData] = useState<{ [empId: string]: TdsProjection }>({});
  const [projectionOpen, setProjectionOpen] = useState<string | null>(null);
  const [projectionLoading, setProjectionLoading] = useState<string | null>(null); // employeeId being loaded
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);

  // FY string derived from year (April year → "year-(year+1-2digits)")
  const fyString = `${year}-${String(year + 1).slice(-2)}`;

  // Persist entityId for modal
  useEffect(() => {
    if (entityId && typeof window !== "undefined") sessionStorage.setItem("complianceEntityId", entityId);
  }, [entityId]);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[] }) => {
        setEntities(opts.entities ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchDetails = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    fetch(`/api/payroll?entityId=${entityId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: { details?: PayrollDetail[] }) => { setDetails(d.details ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entityId, year, month]);

  const fetchFilings = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/compliance/filings?entityId=${entityId}&year=${year}`)
      .then((r) => r.json())
      .then((d: ComplianceFiling[]) => setFilings(d ?? []))
      .catch(() => {});
  }, [entityId, year]);

  const fetchTdsRegister = useCallback(() => {
    if (!entityId) return;
    setTdsLoading(true);
    Promise.all([
      fetch(`/api/compliance/tds?entityId=${entityId}&month=${month}&year=${year}`).then((r) => r.json()) as Promise<{ details: TdsDetail[]; totals: { grossSalary: number; tds: number; ytdTds: number } }>,
      fetch(`/api/compliance/tds/summary?entityId=${entityId}&year=${year}`).then((r) => r.json()) as Promise<{ months: TdsSummaryMonth[]; fyTotal: number }>,
    ])
      .then(([reg, sum]) => {
        setTdsDetails(reg.details ?? []);
        setTdsTotals(reg.totals ?? { grossSalary: 0, tds: 0, ytdTds: 0 });
        setTdsSummary(sum.months ?? []);
        setTdsFyTotal(sum.fyTotal ?? 0);
      })
      .catch(() => {})
      .finally(() => setTdsLoading(false));
  }, [entityId, month, year]);

  const fetchDeclarations = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/compliance/declarations?entityId=${entityId}&fy=${fyString}`)
      .then((r) => r.json())
      .then((d: InvestmentDeclaration[]) => setDeclarations(d ?? []))
      .catch(() => {});
  }, [entityId, fyString]);

  const fetchEmployeeOptions = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/employees?entityId=${entityId}&status=ACTIVE`)
      .then((r) => r.json())
      .then((d: EmployeeOption[]) => setEmployeeOptions(d ?? []))
      .catch(() => {});
  }, [entityId]);

  useEffect(() => { fetchDetails(); fetchFilings(); }, [fetchDetails, fetchFilings]);

  useEffect(() => {
    if (activeTab === "tds") {
      if (tdsSubView === "register") fetchTdsRegister();
      else { fetchDeclarations(); fetchEmployeeOptions(); }
    }
  }, [activeTab, tdsSubView, fetchTdsRegister, fetchDeclarations, fetchEmployeeOptions]);

  const currentEntity = entities.find((e) => e.id === entityId);

  // PF data
  const pfDetails = details.filter((d) => d.pfEmployee > 0);
  const pfTotals = pfDetails.reduce((a, d) => ({
    gross: a.gross + d.grossSalary,
    epfWages: a.epfWages + Math.min(d.earnedBasic, 15000),
    pfEE: a.pfEE + d.pfEmployee,
    pfER: a.pfER + d.pfEmployer,
  }), { gross: 0, epfWages: 0, pfEE: 0, pfER: 0 });
  const pfTotal = pfTotals.pfEE + pfTotals.pfER;

  // ESI data
  const esiAll = details;
  const esiApplicable = details.filter((d) => d.esiEmployee > 0);
  const esiDisplay = showEsiAll ? esiAll : esiApplicable;
  const esiTotals = esiApplicable.reduce((a, d) => ({
    ee: a.ee + d.esiEmployee, er: a.er + d.esiEmployer,
  }), { ee: 0, er: 0 });
  const esiTotal = esiTotals.ee + esiTotals.er;

  // PT data
  const ptDetails = details;
  const ptTotal = ptDetails.reduce((a, d) => a + d.professionalTax, 0);
  const ptSlabs = [
    { label: "≥₹20,001 → ₹200", count: ptDetails.filter(d => d.grossSalary >= 20001).length, total: ptDetails.filter(d => d.grossSalary >= 20001).reduce((a, d) => a + d.professionalTax, 0) },
    { label: "₹15,001–₹20,000 → ₹150", count: ptDetails.filter(d => d.grossSalary >= 15001 && d.grossSalary <= 20000).length, total: ptDetails.filter(d => d.grossSalary >= 15001 && d.grossSalary <= 20000).reduce((a, d) => a + d.professionalTax, 0) },
    { label: "Below ₹15,001 → ₹0", count: ptDetails.filter(d => d.grossSalary < 15001).length, total: 0 },
  ];

  // Metrics
  const totalMonthsInYear = 12;
  const pfFiled = filings.filter((f) => f.type === "PF" && f.status === "FILED").length;
  const esiFiled = filings.filter((f) => f.type === "ESI" && f.status === "FILED").length;
  const ptFiled = filings.filter((f) => f.type === "PT" && f.status === "FILED").length;
  const tdsFiled = filings.filter((f) => f.type === "TDS" && f.status === "FILED").length;
  const overdue = filings.filter((f) => f.status !== "FILED" && new Date(f.dueDate) < now).length;

  // TDS total for current month (for mark filed)
  const currentMonthTds = tdsDetails.reduce((s, d) => s + d.tds, 0);

  // Tracker: build grid
  const trackerMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const trackerTypes = ["PF", "ESI", "PT", "TDS"];
  function getCell(m: number, t: string) {
    const f = filings.find((x) => x.month === m && x.type === t);
    if (f) return f;
    // Synthesize PENDING/OVERDUE
    const dueDay = t === "PT" ? 21 : t === "TDS" ? 7 : 15;
    const dueM = m === 12 ? 1 : m + 1;
    const dueY = m === 12 ? year + 1 : year;
    const due = new Date(dueY, dueM - 1, dueDay);
    const status = due < now ? "OVERDUE" : "PENDING";
    return { id: null, type: t, month: m, year, dueDate: due.toISOString(), status, filedAt: null, referenceNo: null, amount: null, remarks: null };
  }

  function downloadFile(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "pf", label: "PF" },
    { id: "esi", label: "ESI" },
    { id: "pt", label: "PT" },
    { id: "tds", label: "TDS" },
    { id: "tracker", label: "Tracker" },
  ];

  const monthYearBar = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
      <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
        {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  const currentFiling = (type: string) => filings.find((f) => f.type === type && f.month === month && f.year === year);

  return (
    <div style={{ maxWidth: 1600 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Compliance</h1>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={btnPrimary} onClick={() => { fetchDetails(); fetchFilings(); }}>Refresh</button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard color="green" icon={<CheckCircle size={16} />} value={`${pfFiled}/${totalMonthsInYear}`} label="PF Filings (FY)" />
        <MetricCard color="blue" icon={<Shield size={16} />} value={`${esiFiled}/${totalMonthsInYear}`} label="ESI Filings (FY)" />
        <MetricCard color="purple" icon={<CheckCircle size={16} />} value={`${ptFiled}/${totalMonthsInYear}`} label="PT Filings (FY)" />
        <MetricCard color="amber" icon={<CheckCircle size={16} />} value={`${tdsFiled}/${totalMonthsInYear}`} label="TDS Filings (FY)" />
        <MetricCard color="red" icon={<AlertTriangle size={16} />} value={String(overdue)} label="Overdue" />
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: "var(--radius-xs) var(--radius-xs) 0 0", background: "var(--glass)", border: "1px solid var(--glass-border)", borderBottom: "none", flexWrap: "wrap" }}>
        {activeTab !== "tracker" && monthYearBar}
        {activeTab === "pf" && (
          <>
            <button style={btnSecondary} onClick={() => downloadFile(`/api/compliance/pf-ecr?entityId=${entityId}&month=${month}&year=${year}`)}>
              Download ECR
            </button>
            {currentFiling("PF") ? (
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                ✓ Filed — {currentFiling("PF")!.referenceNo}
              </span>
            ) : (
              <button style={btnGreen} onClick={() => setMarkFiled({ type: "PF", amount: pfTotal })}>Mark as Filed</button>
            )}
          </>
        )}
        {activeTab === "esi" && (
          <>
            <button style={btnSecondary} onClick={() => downloadFile(`/api/compliance/esi-file?entityId=${entityId}&month=${month}&year=${year}`)}>
              Download ESI File
            </button>
            <button style={{ ...btnSecondary, fontSize: 11 }} onClick={() => setShowEsiAll((x) => !x)}>
              {showEsiAll ? "Hide Exempted" : "Show Exempted"}
            </button>
            {currentFiling("ESI") ? (
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                ✓ Filed — {currentFiling("ESI")!.referenceNo}
              </span>
            ) : (
              <button style={btnGreen} onClick={() => setMarkFiled({ type: "ESI", amount: esiTotal })}>Mark as Filed</button>
            )}
          </>
        )}
        {activeTab === "pt" && (
          <>
            {currentFiling("PT") ? (
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                ✓ Filed — {currentFiling("PT")!.referenceNo}
              </span>
            ) : (
              <button style={btnGreen} onClick={() => setMarkFiled({ type: "PT", amount: ptTotal })}>Mark as Filed</button>
            )}
          </>
        )}
        {activeTab === "tds" && (
          <>
            <button style={{ ...btnSecondary, fontWeight: tdsSubView === "register" ? 700 : 500, color: tdsSubView === "register" ? "var(--blue)" : "var(--text-3)" }} onClick={() => setTdsSubView("register")}>Register</button>
            <button style={{ ...btnSecondary, fontWeight: tdsSubView === "declarations" ? 700 : 500, color: tdsSubView === "declarations" ? "var(--blue)" : "var(--text-3)" }} onClick={() => setTdsSubView("declarations")}>Declarations</button>
            {tdsSubView === "register" && (
              currentFiling("TDS") ? (
                <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                  ✓ Filed — {currentFiling("TDS")!.referenceNo}
                </span>
              ) : (
                <button style={btnGreen} onClick={() => setMarkFiled({ type: "TDS", amount: currentMonthTds })}>Mark as Filed</button>
              )
            )}
            {tdsSubView === "declarations" && (
              <button style={btnPrimary} onClick={() => { setEditDeclaration(null); setShowDeclarationModal(true); }}>+ Add Declaration</button>
            )}
          </>
        )}
        <div style={{ flex: 1 }} />
        {currentEntity && (
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            {currentEntity.pfCode && <span style={{ marginRight: 12 }}>PF: {currentEntity.pfCode}</span>}
            {currentEntity.esiCode && <span style={{ marginRight: 12 }}>ESI: {currentEntity.esiCode}</span>}
            {currentEntity.ptCode && <span>PT: {currentEntity.ptCode}</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", paddingLeft: 16 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 16px", fontSize: 12, fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--blue)" : "var(--text-3)",
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: isActive ? "2px solid var(--blue)" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="glass-card" style={{ overflow: "hidden", borderRadius: "0 0 var(--radius) var(--radius)" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
        ) : activeTab === "pf" ? (
          pfDetails.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>No PF contributors for this period.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thBase}>Code</th><th style={thBase}>Name</th><th style={thBase}>UAN</th>
                    <th style={thR}>Gross</th><th style={thR}>EPF Wages</th>
                    <th style={{ ...thR, color: "var(--red)" }}>PF EE (12%)</th>
                    <th style={{ ...thR, color: "var(--amber)" }}>PF ER (12%)</th>
                    <th style={{ ...thR, color: "var(--green)" }}>Total PF</th>
                  </tr>
                </thead>
                <tbody>
                  {pfDetails.map((d) => {
                    const epfWages = Math.min(d.earnedBasic, 15000);
                    return (
                      <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{d.employee.employeeCode}</td>
                        <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-4)" }}>{d.employee.uanNumber ?? "—"}</td>
                        <td style={tdR}>{fmt(d.grossSalary)}</td>
                        <td style={{ ...tdR, color: "var(--blue)" }}>{fmt(epfWages)}</td>
                        <td style={{ ...tdR, color: "var(--red)" }}>{fmt(d.pfEmployee)}</td>
                        <td style={{ ...tdR, color: "var(--amber)" }}>{fmt(d.pfEmployer)}</td>
                        <td style={{ ...tdR, color: "var(--green)", fontWeight: 600 }}>{fmt(d.pfEmployee + d.pfEmployer)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={3} style={{ ...tdBase, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>TOTALS ({pfDetails.length})</td>
                    <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(pfTotals.gross)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--blue)", borderTop: "2px solid var(--glass-border)" }}>{fmt(pfTotals.epfWages)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(pfTotals.pfEE)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(pfTotals.pfER)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--green)", borderTop: "2px solid var(--glass-border)" }}>{fmt(pfTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : activeTab === "esi" ? (
          esiApplicable.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>No ESI contributors for this period.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thBase}>Code</th><th style={thBase}>Name</th><th style={thBase}>ESI No.</th>
                    <th style={thR}>Gross</th>
                    <th style={{ ...thR, color: "var(--red)" }}>ESI EE (0.75%)</th>
                    <th style={{ ...thR, color: "var(--amber)" }}>ESI ER (3.25%)</th>
                    <th style={{ ...thR, color: "var(--green)" }}>Total</th>
                    <th style={thBase}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {esiDisplay.map((d) => {
                    const app = d.esiEmployee > 0;
                    return (
                      <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{d.employee.employeeCode}</td>
                        <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-4)" }}>{d.employee.esiNumber ?? "—"}</td>
                        <td style={tdR}>{fmt(d.grossSalary)}</td>
                        <td style={{ ...tdR, color: app ? "var(--red)" : "var(--text-4)" }}>{app ? fmt(d.esiEmployee) : "—"}</td>
                        <td style={{ ...tdR, color: app ? "var(--amber)" : "var(--text-4)" }}>{app ? fmt(d.esiEmployer) : "—"}</td>
                        <td style={{ ...tdR, color: app ? "var(--green)" : "var(--text-4)", fontWeight: app ? 600 : 400 }}>{app ? fmt(d.esiEmployee + d.esiEmployer) : "—"}</td>
                        <td style={tdBase}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: app ? "var(--green-bg)" : "var(--amber-bg)", color: app ? "var(--green)" : "var(--amber)" }}>
                            {app ? "Applicable" : "Exempted"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={4} style={{ ...tdBase, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>TOTALS ({esiApplicable.length} applicable)</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(esiTotals.ee)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(esiTotals.er)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "var(--green)", borderTop: "2px solid var(--glass-border)" }}>{fmt(esiTotal)}</td>
                    <td style={{ borderTop: "2px solid var(--glass-border)" }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : activeTab === "pt" ? (
          ptDetails.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>No payroll data for this period.</div>
          ) : (
            <div>
              {/* Slab summary cards */}
              <div style={{ display: "flex", gap: 12, padding: 16, flexWrap: "wrap" }}>
                {ptSlabs.map((s) => (
                  <div key={s.label} style={{ padding: "12px 20px", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.total > 0 ? "var(--amber)" : "var(--text-4)" }}>₹{fmt(s.total)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>{s.count} employees</div>
                  </div>
                ))}
                <div style={{ padding: "12px 20px", background: "var(--green-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", minWidth: 200 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>GRAND TOTAL</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)" }}>₹{fmt(ptTotal)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>{ptDetails.filter(d => d.professionalTax > 0).length} contributors</div>
                </div>
              </div>
              {/* Detail table */}
              <div style={{ overflowX: "auto", borderTop: "1px solid var(--glass-border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thBase}>Code</th><th style={thBase}>Name</th>
                      <th style={thR}>Gross</th><th style={thBase}>Slab</th>
                      <th style={{ ...thR, color: "var(--amber)" }}>PT Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptDetails.map((d) => {
                      const slab = d.grossSalary >= 20001 ? "≥₹20,001" : d.grossSalary >= 15001 ? "₹15,001–₹20,000" : "Below ₹15,001";
                      return (
                        <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{d.employee.employeeCode}</td>
                          <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                          <td style={tdR}>{fmt(d.grossSalary)}</td>
                          <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{slab}</td>
                          <td style={{ ...tdR, color: d.professionalTax > 0 ? "var(--amber)" : "var(--text-4)", fontWeight: d.professionalTax > 0 ? 600 : 400 }}>
                            {d.professionalTax > 0 ? fmt(d.professionalTax) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--bg-2)" }}>
                      <td colSpan={4} style={{ ...tdBase, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>TOTALS</td>
                      <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(ptTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        ) : activeTab === "tds" ? (
          tdsLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
          ) : tdsSubView === "register" ? (
            /* TDS Register */
            <div>
              {tdsDetails.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>No payroll data for this period. TDS register will appear after payroll is processed.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thBase}>Code</th><th style={thBase}>Name</th><th style={thBase}>PAN</th>
                        <th style={thR}>Gross Salary</th>
                        <th style={{ ...thR, color: "var(--amber)" }}>TDS Deducted</th>
                        <th style={{ ...thR, color: "var(--blue)" }}>YTD TDS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tdsDetails.map((d) => (
                        <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{d.employeeCode}</td>
                          <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.fullName}</td>
                          <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-4)" }}>{d.panNumber ?? "—"}</td>
                          <td style={tdR}>{fmt(d.grossSalary)}</td>
                          <td style={{ ...tdR, color: d.tds > 0 ? "var(--amber)" : "var(--text-4)", fontWeight: d.tds > 0 ? 600 : 400 }}>{d.tds > 0 ? fmt(d.tds) : "—"}</td>
                          <td style={{ ...tdR, color: "var(--blue)", fontWeight: 600 }}>{fmt(d.ytdTds)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--bg-2)" }}>
                        <td colSpan={3} style={{ ...tdBase, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>TOTALS ({tdsDetails.length})</td>
                        <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(tdsTotals.grossSalary)}</td>
                        <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(tdsTotals.tds)}</td>
                        <td style={{ ...tdR, fontWeight: 700, color: "var(--blue)", borderTop: "2px solid var(--glass-border)" }}>{fmt(tdsTotals.ytdTds)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {/* Monthly TDS Summary */}
              <div style={{ padding: 16, borderTop: "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 12 }}>
                  Monthly TDS Summary — FY {fyString} &nbsp;
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>
                    Total: ₹{fmt(tdsFyTotal)}
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thBase}>Month</th>
                        <th style={thR}>Total TDS</th>
                        <th style={{ ...thBase, textAlign: "center" }}>Employees</th>
                        <th style={{ ...thBase, textAlign: "center" }}>Challan Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tdsSummary.map((m) => {
                        const statusStyle: Record<string, React.CSSProperties> = {
                          FILED: { background: "var(--green-bg)", color: "var(--green)" },
                          PENDING: { background: "var(--amber-bg)", color: "var(--amber)" },
                          OVERDUE: { background: "var(--red-bg)", color: "var(--red)" },
                        };
                        const st = m.challanStatus ? (statusStyle[m.challanStatus] ?? statusStyle.PENDING) : null;
                        return (
                          <tr key={`${m.month}-${m.year}`} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                            <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{m.monthName} {m.year}</td>
                            <td style={{ ...tdR, color: m.totalTds > 0 ? "var(--amber)" : "var(--text-4)", fontWeight: m.totalTds > 0 ? 600 : 400 }}>{m.totalTds > 0 ? `₹${fmt(m.totalTds)}` : "—"}</td>
                            <td style={{ ...tdBase, textAlign: "center", color: "var(--text-3)" }}>{m.employeeCount || "—"}</td>
                            <td style={{ ...tdBase, textAlign: "center" }}>
                              {st && m.challanStatus ? (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, ...st }}>{m.challanStatus}</span>
                              ) : <span style={{ color: "var(--text-4)", fontSize: 11 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Declarations sub-view */
            <div>
              {declarations.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
                  No declarations for FY {fyString}. Click &quot;+ Add Declaration&quot; to add one.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thBase}>Code</th><th style={thBase}>Name</th><th style={thBase}>Dept</th>
                        <th style={{ ...thBase, textAlign: "center" }}>Regime</th>
                        <th style={thR}>80C</th><th style={thR}>80D</th><th style={thR}>24(b)</th><th style={thR}>Other</th>
                        <th style={{ ...thR, color: "var(--blue)" }}>Total Deductions</th>
                        <th style={{ ...thBase, textAlign: "center" }}>Status</th>
                        <th style={thBase}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {declarations.map((d) => {
                        const other = d.sec80E_eduLoan + d.sec80G_donation + d.nps_80CCD;
                        return (
                          <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                            <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{d.employee.employeeCode}</td>
                            <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                            <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{d.employee.department?.name ?? "—"}</td>
                            <td style={{ ...tdBase, textAlign: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: d.regime === "OLD" ? "var(--amber-bg)" : "var(--blue-bg, rgba(59,130,246,0.15))", color: d.regime === "OLD" ? "var(--amber)" : "var(--blue)" }}>
                                {d.regime}
                              </span>
                            </td>
                            <td style={tdR}>{fmt(d.total80C)}</td>
                            <td style={tdR}>{fmt(d.sec80D_self + d.sec80D_parents)}</td>
                            <td style={tdR}>{fmt(d.sec24_homeLoanInterest)}</td>
                            <td style={tdR}>{fmt(other)}</td>
                            <td style={{ ...tdR, color: "var(--blue)", fontWeight: 600 }}>₹{fmt(d.totalDeductions)}</td>
                            <td style={{ ...tdBase, textAlign: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: d.status === "LOCKED" ? "var(--green-bg)" : d.status === "VERIFIED" ? "var(--blue-bg, rgba(59,130,246,0.15))" : "var(--amber-bg)", color: d.status === "LOCKED" ? "var(--green)" : d.status === "VERIFIED" ? "var(--blue)" : "var(--amber)" }}>
                                {d.status}
                              </span>
                            </td>
                            <td style={{ ...tdBase, whiteSpace: "nowrap" }}>
                              <button style={{ ...btnSecondary, fontSize: 11, marginRight: 6 }} onClick={() => { setEditDeclaration(d); setShowDeclarationModal(true); }}>Edit</button>
                              <button style={{ ...btnSecondary, fontSize: 11 }} onClick={async () => {
                                if (projectionOpen === d.employeeId) { setProjectionOpen(null); return; }
                                setProjectionLoading(d.employeeId);
                                try {
                                  const res = await fetch(`/api/compliance/tds/projection?employeeId=${d.employeeId}&fy=${fyString}`);
                                  if (!res.ok) throw new Error("API error");
                                  const data = await res.json() as TdsProjection;
                                  setProjectionData((prev) => ({ ...prev, [d.employeeId]: data }));
                                  setProjectionOpen(d.employeeId);
                                } catch { alert("Failed to load projection"); } finally { setProjectionLoading(null); }
                              }}>
                                {projectionLoading === d.employeeId ? "Loading…" : projectionOpen === d.employeeId ? "▲ Hide" : "▼ View Projection"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Projection Panel */}
              {projectionOpen && projectionData[projectionOpen] && (() => {
                const p = projectionData[projectionOpen];
                const emp = declarations.find((d) => d.employeeId === projectionOpen);

                const deductionRows: [string, number][] = [
                  ["Standard Deduction (u/s 16)", p.standardDeduction],
                  ...(p.professionalTax > 0 ? [["Professional Tax", p.professionalTax] as [string, number]] : []),
                  ...(p.sec80C > 0 ? [["Section 80C (PPF / ELSS / LIC etc.)", p.sec80C] as [string, number]] : []),
                  ...(p.sec80D > 0 ? [["Section 80D (Health Insurance)", p.sec80D] as [string, number]] : []),
                  ...(p.sec24 > 0 ? [["Section 24(b) (Home Loan Interest)", p.sec24] as [string, number]] : []),
                  ...(p.otherDeductions > 0 ? [["Other (80E / 80G / NPS 80CCD)", p.otherDeductions] as [string, number]] : []),
                  ...(p.hraExemption > 0 ? [["HRA Exemption", p.hraExemption] as [string, number]] : []),
                ];

                // Slab-wise breakdown
                const newSlabs = [
                  { range: "₹0 – ₹4,00,000", rate: "Nil" },
                  { range: "₹4,00,001 – ₹8,00,000", rate: "5%" },
                  { range: "₹8,00,001 – ₹12,00,000", rate: "10%" },
                  { range: "₹12,00,001 – ₹16,00,000", rate: "15%" },
                  { range: "₹16,00,001 – ₹20,00,000", rate: "20%" },
                  { range: "₹20,00,001 – ₹24,00,000", rate: "25%" },
                  { range: "Above ₹24,00,000", rate: "30%" },
                  { range: "Rebate u/s 87A (income ≤ ₹12L)", rate: "Tax = ₹0" },
                ];
                const oldSlabs = [
                  { range: "₹0 – ₹2,50,000", rate: "Nil" },
                  { range: "₹2,50,001 – ₹5,00,000", rate: "5%" },
                  { range: "₹5,00,001 – ₹10,00,000", rate: "20%" },
                  { range: "Above ₹10,00,000", rate: "30%" },
                  { range: "Rebate u/s 87A (income ≤ ₹5L)", rate: "Tax = ₹0" },
                ];
                const slabs = p.selectedRegime === "NEW" ? newSlabs : oldSlabs;
                const baseTax = p.selectedRegime === "NEW" ? p.taxNewRegime : p.taxOldRegime;
                const cessAmt = p.applicableTax - Math.round(baseTax / 1.04);

                return (
                  <div style={{ margin: 16, padding: 20, background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                          TDS Projection — {emp?.employee.fullName} — FY {fyString}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          <span style={{ fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: p.selectedRegime === "OLD" ? "var(--amber-bg)" : "rgba(59,130,246,0.15)", color: p.selectedRegime === "OLD" ? "var(--amber)" : "var(--blue)", marginRight: 8 }}>{p.selectedRegime} Regime</span>
                          {p.monthsRemaining} month{p.monthsRemaining !== 1 ? "s" : ""} remaining in FY
                        </div>
                      </div>
                      <button onClick={() => setProjectionOpen(null)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                      {/* Column 1: Income & Deductions */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Income & Deductions</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "5px 0", color: "var(--text-2)", fontWeight: 600 }}>Annual Gross</td>
                              <td style={{ padding: "5px 0", textAlign: "right", color: "var(--text-1)", fontWeight: 700 }}>₹{fmt(p.annualGross)}</td>
                            </tr>
                            {deductionRows.map(([label, val]) => (
                              <tr key={label}>
                                <td style={{ padding: "4px 0 4px 8px", color: "var(--text-3)", fontSize: 11 }}>− {label}</td>
                                <td style={{ padding: "4px 0", textAlign: "right", color: "var(--red)", fontSize: 11 }}>₹{fmt(val)}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: "2px solid var(--glass-border)" }}>
                              <td style={{ padding: "8px 0 4px", fontWeight: 700, color: "var(--text-1)", fontSize: 12 }}>Taxable Income</td>
                              <td style={{ padding: "8px 0 4px", textAlign: "right", fontWeight: 800, color: "var(--blue)", fontSize: 15 }}>₹{fmt(p.taxableIncome)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Column 2: Slab-wise breakdown */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Tax Slabs ({p.selectedRegime} Regime)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "4px 0", textAlign: "left", color: "var(--text-4)", fontWeight: 600 }}>Range</th>
                              <th style={{ padding: "4px 0", textAlign: "right", color: "var(--text-4)", fontWeight: 600 }}>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slabs.map((s) => (
                              <tr key={s.range}>
                                <td style={{ padding: "4px 0", color: "var(--text-3)" }}>{s.range}</td>
                                <td style={{ padding: "4px 0", textAlign: "right", color: "var(--amber)", fontWeight: 600 }}>{s.rate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: "var(--radius-xs)", background: "var(--bg-2)", fontSize: 11 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-3)" }}>Tax before cess</span>
                            <span style={{ color: "var(--text-2)", fontWeight: 600 }}>₹{fmt(Math.round(baseTax / 1.04))}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ color: "var(--text-3)" }}>Health & Education Cess (4%)</span>
                            <span style={{ color: "var(--text-2)", fontWeight: 600 }}>₹{fmt(cessAmt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Summary */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Tax Summary</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {[
                            { label: "Tax — Old Regime", val: p.taxOldRegime, highlight: p.selectedRegime === "OLD" },
                            { label: "Tax — New Regime", val: p.taxNewRegime, highlight: p.selectedRegime === "NEW" },
                            { label: "Total Tax Liability", val: p.applicableTax, big: true },
                            { label: "Monthly TDS (÷12)", val: p.monthlyTds },
                            { label: "TDS Paid YTD", val: p.tdsPaidYtd, color: "var(--green)" },
                            { label: "TDS Remaining", val: p.tdsRemaining, color: p.tdsRemaining > 0 ? "var(--amber)" : "var(--green)" },
                          ].map(({ label, val, highlight, big, color }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "var(--radius-xs)", background: highlight ? "rgba(59,130,246,0.12)" : "var(--bg-2)", border: highlight ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent" }}>
                              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</span>
                              <span style={{ fontSize: big ? 15 : 12, fontWeight: big ? 800 : 600, color: color ?? (highlight ? "var(--blue)" : "var(--text-1)") }}>
                                ₹{fmt(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )
        ) : (
          /* Tracker Tab */
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thBase}>Month</th>
                  {trackerTypes.map((t) => <th key={t} style={{ ...thBase, textAlign: "center" }}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {trackerMonths.map((m) => (
                  <tr key={m} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{MONTHS[m - 1]} {year}</td>
                    {trackerTypes.map((t) => {
                      const cell = getCell(m, t);
                      const statusStyle: Record<string, React.CSSProperties> = {
                        FILED: { background: "var(--green-bg)", color: "var(--green)" },
                        PENDING: { background: "var(--amber-bg)", color: "var(--amber)" },
                        OVERDUE: { background: "var(--red-bg)", color: "var(--red)" },
                      };
                      const st = statusStyle[cell.status] ?? statusStyle.PENDING;
                      return (
                        <td key={t} style={{ ...tdBase, textAlign: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 12, ...st }}>
                            {cell.status}
                          </span>
                          {cell.status === "FILED" && cell.referenceNo && (
                            <div style={{ fontSize: 9, color: "var(--text-4)", marginTop: 2 }}>{cell.referenceNo}</div>
                          )}
                          {cell.status !== "FILED" && (
                            <div style={{ fontSize: 9, color: "var(--text-4)", marginTop: 2 }}>
                              Due: {fmtDate(cell.dueDate)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Filed Modal */}
      {markFiled && (
        <MarkFiledModal
          type={markFiled.type}
          month={month}
          year={year}
          defaultAmount={markFiled.amount}
          onClose={() => setMarkFiled(null)}
          onFiled={() => { fetchFilings(); if (activeTab === "tds") fetchTdsRegister(); }}
        />
      )}

      {/* Declaration Modal */}
      {showDeclarationModal && (
        <DeclarationModal
          entityId={entityId}
          fy={fyString}
          employees={employeeOptions}
          initial={editDeclaration}
          onClose={() => { setShowDeclarationModal(false); setEditDeclaration(null); }}
          onSaved={() => { fetchDeclarations(); }}
        />
      )}

      {/* Unused import suppressor */}
      <span style={{ display: "none" }}><Clock size={0} /></span>
    </div>
  );
}
