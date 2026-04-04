"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, Users, TrendingDown, Wallet, Lock } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { PayslipModal, type PayslipDetail } from "@/components/PayslipModal";
import { exportSalaryRegister } from "@/lib/export-payroll";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Tab = "salary" | "pf" | "esi" | "pt";

interface Entity { id: string; code: string; name: string; }
interface Location { id: string; name: string; entityId: string; }

interface PayrollRun {
  id: string;
  status: "DRAFT" | "PROCESSED" | "LOCKED";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  processedAt: string | null;
  lockedAt: string | null;
}

interface PayrollDetail extends PayslipDetail {
  id: string;
  workedDays: number;
  otDays: number;
  leaveEncashDays: number;
  labourHoliday: number;
  salary: number;
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
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-xs)",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "var(--transition)",
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-xs)",
  background: "var(--blue)",
  border: "none",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "var(--transition)",
};

const btnAmber: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-xs)",
  background: "var(--amber-bg)",
  border: "1px solid var(--glass-border)",
  color: "var(--amber)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "var(--transition)",
};

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtRupee(n: number) { return "\u20B9" + n.toLocaleString("en-IN"); }

function StatusBadge({ status }: { status: "DRAFT" | "PROCESSED" | "LOCKED" }) {
  const styles: Record<string, React.CSSProperties> = {
    DRAFT: { background: "var(--amber-bg)", color: "var(--amber)" },
    PROCESSED: { background: "var(--blue-bg)", color: "var(--blue)" },
    LOCKED: { background: "var(--green-bg)", color: "var(--green)" },
  };
  return (
    <span style={{
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4,
      ...styles[status],
    }}>
      {status === "LOCKED" && <Lock size={10} />}
      &#9679; {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)",
};
const tdBase: React.CSSProperties = {
  padding: "9px 12px", fontSize: 12, color: "var(--text-2)",
  borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap",
};
const thR: React.CSSProperties = { ...thBase, textAlign: "right" };
const thL: React.CSSProperties = { ...thBase, textAlign: "left" };
const tdR: React.CSSProperties = { ...tdBase, textAlign: "right" };

// ─── Sub-tables ───────────────────────────────────────────────────────────────

function PFRegister({ details }: { details: PayrollDetail[] }) {
  const pfDetails = details.filter((d) => d.pfEmployee > 0);
  const totals = pfDetails.reduce(
    (a, d) => ({
      earnedBasic: a.earnedBasic + d.earnedBasic,
      pfBase: a.pfBase + Math.min(d.earnedBasic, 15000),
      pfEmployee: a.pfEmployee + d.pfEmployee,
      pfEmployer: a.pfEmployer + d.pfEmployer,
      totalPf: a.totalPf + d.pfEmployee + d.pfEmployer,
    }),
    { earnedBasic: 0, pfBase: 0, pfEmployee: 0, pfEmployer: 0, totalPf: 0 }
  );

  if (pfDetails.length === 0) {
    return <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>No PF contributors in this payroll.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thL}>Code</th><th style={thL}>Name</th>
            <th style={thR}>Gross</th><th style={thR}>Earned Basic</th>
            <th style={{ ...thR, color: "var(--blue)" }}>PF Base</th>
            <th style={{ ...thR, color: "var(--red)" }}>PF Employee (12%)</th>
            <th style={{ ...thR, color: "var(--amber)" }}>PF Employer (12%)</th>
            <th style={{ ...thR, color: "var(--green)" }}>Total PF</th>
          </tr>
        </thead>
        <tbody>
          {pfDetails.map((d) => {
            const pfBase = Math.min(d.earnedBasic, 15000);
            return (
              <tr key={d.id}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{d.employee.employeeCode}</td>
                <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                <td style={tdR}>{fmt(d.grossSalary)}</td>
                <td style={tdR}>{fmt(d.earnedBasic)}</td>
                <td style={{ ...tdR, color: "var(--blue)" }}>{fmt(pfBase)}</td>
                <td style={{ ...tdR, color: "var(--red)" }}>{fmt(d.pfEmployee)}</td>
                <td style={{ ...tdR, color: "var(--amber)" }}>{fmt(d.pfEmployer)}</td>
                <td style={{ ...tdR, color: "var(--green)", fontWeight: 600 }}>{fmt(d.pfEmployee + d.pfEmployer)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--bg-2)" }}>
            <td colSpan={2} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
              TOTALS ({pfDetails.length} contributors)
            </td>
            <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}></td>
            <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.earnedBasic)}</td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--blue)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.pfBase)}</td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.pfEmployee)}</td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.pfEmployer)}</td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--green)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.totalPf)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ESIRegister({ details }: { details: PayrollDetail[] }) {
  const applicable = details.filter((d) => d.esiEmployee > 0);
  const totals = applicable.reduce(
    (a, d) => ({ esi_emp: a.esi_emp + d.esiEmployee, esi_er: a.esi_er + d.esiEmployer }),
    { esi_emp: 0, esi_er: 0 }
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thL}>Code</th><th style={thL}>Name</th>
            <th style={thR}>Gross</th>
            <th style={{ ...thR, color: "var(--red)" }}>ESI Employee (0.75%)</th>
            <th style={{ ...thR, color: "var(--amber)" }}>ESI Employer (3.25%)</th>
            <th style={thL}>Status</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => {
            const isApplicable = d.esiEmployee > 0;
            return (
              <tr key={d.id}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{d.employee.employeeCode}</td>
                <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                <td style={tdR}>{fmt(d.grossSalary)}</td>
                <td style={{ ...tdR, color: isApplicable ? "var(--red)" : "var(--text-4)" }}>{isApplicable ? fmt(d.esiEmployee) : "—"}</td>
                <td style={{ ...tdR, color: isApplicable ? "var(--amber)" : "var(--text-4)" }}>{isApplicable ? fmt(d.esiEmployer) : "—"}</td>
                <td style={tdBase}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                    background: isApplicable ? "var(--green-bg)" : "var(--amber-bg)",
                    color: isApplicable ? "var(--green)" : "var(--amber)",
                  }}>
                    {isApplicable ? "Applicable" : "Exempted"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--bg-2)" }}>
            <td colSpan={2} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
              TOTALS ({applicable.length} applicable)
            </td>
            <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}></td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.esi_emp)}</td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.esi_er)}</td>
            <td style={{ borderTop: "2px solid var(--glass-border)" }}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PTRegister({ details }: { details: PayrollDetail[] }) {
  const totalPt = details.reduce((a, d) => a + d.professionalTax, 0);

  function slab(gross: number) {
    if (gross >= 20001) return "\u226520,001";
    if (gross >= 15001) return "\u226515,001";
    return "Below threshold";
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thL}>Code</th><th style={thL}>Name</th>
            <th style={thR}>Gross</th>
            <th style={thL}>PT Slab</th>
            <th style={{ ...thR, color: "var(--red)" }}>PT Amount</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.id}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{d.employee.employeeCode}</td>
              <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
              <td style={tdR}>{fmt(d.grossSalary)}</td>
              <td style={{ ...tdBase, color: d.professionalTax > 0 ? "var(--text-2)" : "var(--text-4)" }}>{slab(d.grossSalary)}</td>
              <td style={{ ...tdR, color: d.professionalTax > 0 ? "var(--red)" : "var(--text-4)", fontWeight: d.professionalTax > 0 ? 600 : 400 }}>
                {d.professionalTax > 0 ? fmt(d.professionalTax) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--bg-2)" }}>
            <td colSpan={3} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
              TOTALS
            </td>
            <td style={{ borderTop: "2px solid var(--glass-border)" }}></td>
            <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totalPt)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [entityId, setEntityId] = useState("");
  const [locationId, setLocationId] = useState("all");

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [details, setDetails] = useState<PayrollDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locking, setLocking] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("salary");
  const [selectedDetail, setSelectedDetail] = useState<PayrollDetail | null>(null);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[]; locations: Location[] }) => {
        setEntities(opts.entities ?? []);
        setLocations(opts.locations ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    const params = new URLSearchParams({ entityId, year: String(year), month: String(month) });
    fetch(`/api/payroll?${params}`)
      .then((r) => r.json())
      .then((data: { run: PayrollRun | null; details: PayrollDetail[] }) => {
        setRun(data.run);
        setDetails(data.details ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityId, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleProcess() {
    if (!entityId) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/payroll/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, year, month }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? "Processing failed");
        return;
      }
      fetchData();
    } catch { /* ignore */ } finally { setProcessing(false); }
  }

  async function handleLock() {
    if (!run) return;
    const monthName = MONTHS[month - 1];
    if (!confirm(`Lock payroll for ${monthName} ${year}? This cannot be undone.`)) return;
    setLocking(true);
    try {
      const res = await fetch("/api/payroll/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: run.id }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? "Lock failed");
        return;
      }
      fetchData();
    } catch { /* ignore */ } finally { setLocking(false); }
  }

  function handleExport() {
    if (!details.length) return;
    const entity = entities.find((e) => e.id === entityId);
    exportSalaryRegister(details, MONTHS[month - 1], year, entity?.name ?? "Export");
  }

  const filteredLocations = locations.filter((l) => !entityId || l.entityId === entityId);
  const currentEntity = entities.find((e) => e.id === entityId);

  // Totals for salary register
  const totals = details.reduce(
    (acc, d) => ({
      payableDays: acc.payableDays + d.payableDays,
      earnedBasic: acc.earnedBasic + d.earnedBasic,
      earnedHra: acc.earnedHra + d.earnedHra,
      earnedSpecial: acc.earnedSpecial + d.earnedSpecial,
      grossSalary: acc.grossSalary + d.grossSalary,
      pfEmployee: acc.pfEmployee + d.pfEmployee,
      esiEmployee: acc.esiEmployee + d.esiEmployee,
      professionalTax: acc.professionalTax + d.professionalTax,
      totalDeductions: acc.totalDeductions + d.totalDeductions,
      netSalary: acc.netSalary + d.netSalary,
    }),
    { payableDays: 0, earnedBasic: 0, earnedHra: 0, earnedSpecial: 0, grossSalary: 0, pfEmployee: 0, esiEmployee: 0, professionalTax: 0, totalDeductions: 0, netSalary: 0 }
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: "salary", label: "Salary Register" },
    { id: "pf", label: "PF Register" },
    { id: "esi", label: "ESI Register" },
    { id: "pt", label: "PT Register" },
  ];

  return (
    <div style={{ maxWidth: 1600 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Payroll</h1>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.code} \u2014 {e.name}</option>)}
        </select>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          <option value="all">All Locations</option>
          {filteredLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
        <MetricCard color="amber" icon={<IndianRupee size={16} />} value={run ? fmtRupee(run.totalGross) : "\u20B90"} label="Total Gross" />
        <MetricCard color="red" icon={<TrendingDown size={16} />} value={run ? fmtRupee(run.totalDeductions) : "\u20B90"} label="Total Deductions" />
        <MetricCard color="green" icon={<Wallet size={16} />} value={run ? fmtRupee(run.totalNet) : "\u20B90"} label="Net Pay" />
        <MetricCard color="blue" icon={<Users size={16} />} value={run ? String(run.employeeCount) : "0"} label="Employees" />
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0, padding: "12px 16px", borderRadius: "var(--radius-xs) var(--radius-xs) 0 0", background: "var(--glass)", border: "1px solid var(--glass-border)", borderBottom: "none", flexWrap: "wrap" }}>
        <button
          style={processing || run?.status === "LOCKED" ? { ...btnAmber, opacity: 0.5, cursor: "not-allowed" } : btnAmber}
          disabled={processing || run?.status === "LOCKED"}
          onClick={handleProcess}
        >
          {processing ? "Processing\u2026" : "Process Payroll"}
        </button>

        {run?.status === "PROCESSED" && (
          <button
            style={locking ? { ...btnSecondary, opacity: 0.7, cursor: "not-allowed" } : btnSecondary}
            disabled={locking}
            onClick={handleLock}
          >
            {locking ? "Locking\u2026" : "Lock Payroll"}
          </button>
        )}

        <button
          style={!details.length ? { ...btnSecondary, opacity: 0.4, cursor: "not-allowed" } : btnSecondary}
          disabled={!details.length}
          onClick={handleExport}
        >
          Export Excel
        </button>

        <div style={{ flex: 1 }} />

        {run ? <StatusBadge status={run.status} /> : (
          <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--glass)", color: "var(--text-3)" }}>
            &#9679; Not Processed
          </span>
        )}
        <button style={btnPrimary} onClick={fetchData} disabled={loading}>
          {loading ? "Loading\u2026" : "Refresh"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", paddingLeft: 16 }}>
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

      {/* Table */}
      <div className="glass-card" style={{ overflow: "hidden", borderRadius: "0 0 var(--radius) var(--radius)" }}>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading payroll data\u2026</div>
        ) : details.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
            {run ? "No employee details found." : "Click \u201cProcess Payroll\u201d to generate the salary register."}
          </div>
        ) : activeTab === "pf" ? (
          <PFRegister details={details} />
        ) : activeTab === "esi" ? (
          <ESIRegister details={details} />
        ) : activeTab === "pt" ? (
          <PTRegister details={details} />
        ) : (
          /* Salary Register */
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thL}>Code</th>
                  <th style={thL}>Name</th>
                  <th style={thL}>Dept</th>
                  <th style={thR}>Days</th>
                  <th style={thR}>Basic</th>
                  <th style={thR}>HRA</th>
                  <th style={thR}>Special</th>
                  <th style={{ ...thR, background: "rgba(255,159,10,0.06)", color: "var(--amber)" }}>Gross</th>
                  <th style={{ ...thR, color: "var(--red)" }}>PF</th>
                  <th style={{ ...thR, color: "var(--red)" }}>ESI</th>
                  <th style={{ ...thR, color: "var(--red)" }}>PT</th>
                  <th style={{ ...thR, background: "rgba(255,69,58,0.06)", color: "var(--red)" }}>Deductions</th>
                  <th style={{ ...thR, background: "rgba(52,199,89,0.06)", color: "var(--green)" }}>Net Pay</th>
                  <th style={{ ...thBase, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {details.map((d) => (
                  <tr key={d.id}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ ...tdBase, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>{d.employee.employeeCode}</td>
                    <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{d.employee.fullName}</td>
                    <td style={{ ...tdBase, color: "var(--text-3)" }}>{d.employee.department?.name ?? "\u2014"}</td>
                    <td style={tdR}>{d.payableDays}</td>
                    <td style={tdR}>{fmt(d.earnedBasic)}</td>
                    <td style={tdR}>{fmt(d.earnedHra)}</td>
                    <td style={tdR}>{fmt(d.earnedSpecial)}</td>
                    <td style={{ ...tdR, background: "rgba(255,159,10,0.04)", color: "var(--amber)", fontWeight: 600 }}>{fmt(d.grossSalary)}</td>
                    <td style={{ ...tdR, color: "var(--red)" }}>{fmt(d.pfEmployee)}</td>
                    <td style={{ ...tdR, color: "var(--red)" }}>{fmt(d.esiEmployee)}</td>
                    <td style={{ ...tdR, color: "var(--red)" }}>{fmt(d.professionalTax)}</td>
                    <td style={{ ...tdR, background: "rgba(255,69,58,0.04)", color: "var(--red)", fontWeight: 600 }}>{fmt(d.totalDeductions)}</td>
                    <td style={{ ...tdR, background: "rgba(52,199,89,0.04)", color: "var(--green)", fontWeight: 700 }}>{fmt(d.netSalary)}</td>
                    <td style={{ ...tdBase, textAlign: "center" }}>
                      <span
                        style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => setSelectedDetail(d)}
                      >
                        View
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--bg-2)" }}>
                  <td colSpan={3} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
                    TOTALS ({details.length} employees)
                  </td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>{totals.payableDays.toFixed(1)}</td>
                  <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.earnedBasic)}</td>
                  <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.earnedHra)}</td>
                  <td style={{ ...tdR, fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.earnedSpecial)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--amber)", background: "rgba(255,159,10,0.06)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.grossSalary)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.pfEmployee)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.esiEmployee)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.professionalTax)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--red)", background: "rgba(255,69,58,0.06)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.totalDeductions)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "var(--green)", background: "rgba(52,199,89,0.06)", borderTop: "2px solid var(--glass-border)" }}>{fmt(totals.netSalary)}</td>
                  <td style={{ ...tdBase, borderTop: "2px solid var(--glass-border)" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {run && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            {MONTHS[month - 1]} {year}
            {run.processedAt && ` \u00B7 Processed: ${new Date(run.processedAt).toLocaleDateString("en-IN")}`}
            {run.lockedAt && ` \u00B7 Locked: ${new Date(run.lockedAt).toLocaleDateString("en-IN")}`}
          </span>
        </div>
      )}

      {/* Payslip Modal */}
      {selectedDetail && (
        <PayslipModal
          detail={selectedDetail}
          month={month}
          year={year}
          entityName={currentEntity?.name ?? ""}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
}
