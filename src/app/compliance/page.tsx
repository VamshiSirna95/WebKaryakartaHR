"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

type Tab = "pf" | "esi" | "pt" | "tracker";

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

  useEffect(() => { fetchDetails(); fetchFilings(); }, [fetchDetails, fetchFilings]);

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
  const overdue = filings.filter((f) => f.status !== "FILED" && new Date(f.dueDate) < now).length;

  // Tracker: build grid
  const trackerMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const trackerTypes = ["PF", "ESI", "PT"];
  function getCell(m: number, t: string) {
    const f = filings.find((x) => x.month === m && x.type === t);
    if (f) return f;
    // Synthesize PENDING/OVERDUE for months with payroll
    const dueDay = t === "PT" ? 21 : 15;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard color="green" icon={<CheckCircle size={16} />} value={`${pfFiled}/${totalMonthsInYear}`} label="PF Filings (FY)" />
        <MetricCard color="blue" icon={<Shield size={16} />} value={`${esiFiled}/${totalMonthsInYear}`} label="ESI Filings (FY)" />
        <MetricCard color="purple" icon={<CheckCircle size={16} />} value={`${ptFiled}/${totalMonthsInYear}`} label="PT Filings (FY)" />
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
          onFiled={() => { fetchFilings(); }}
        />
      )}

      {/* Unused import suppressor */}
      <span style={{ display: "none" }}><Clock size={0} /></span>
    </div>
  );
}
