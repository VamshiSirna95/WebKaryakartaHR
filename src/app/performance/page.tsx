"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Users, IndianRupee, AlertTriangle, CheckCircle } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

type Tab = "entry" | "dashboard" | "settings";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Types ─────────────────────────────────────────────────────────────────

interface Entity { id: string; code: string; name: string; }
interface Department { id: string; name: string; }

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  location: { id: string; code: string; name: string } | null;
  department: { id: string; name: string } | null;
  subDepartment: { id: string; name: string } | null;
}

interface SalesRecord {
  id: string;
  employeeId: string;
  totalSales: number;
  workedDays: number;
  grossSalary: number;
  perDayAvg: number;
  salaryRatio: number;
  status: string;
  notes: string | null;
  employee: {
    employeeCode: string;
    fullName: string;
    location: { id: string; code: string; name: string } | null;
    department: { id: string; name: string } | null;
    subDepartment: { id: string; name: string } | null;
  };
}

interface LeaderboardRecord extends SalesRecord {
  rank: number;
}

interface SummaryData {
  totalSales: number;
  avgRatio: number;
  statusCounts: { GOOD: number; IMPROVE: number; POOR: number };
  byLocation: { locationId: string; locationName: string; totalSales: number; avgRatio: number; count: number; statusCounts: { GOOD: number; IMPROVE: number; POOR: number } }[];
  bySubDepartment: { subDeptId: string; subDeptName: string; totalSales: number; avgRatio: number; count: number }[];
}

interface Threshold {
  id: string;
  entityId: string;
  departmentId: string | null;
  goodBelow: number;
  improveBelow: number;
  department: { id: string; name: string } | null;
}

// Row for the Sales Entry grid (before save)
interface EntryRow {
  employee: Employee;
  totalSales: string;        // input value as string
  workedDays: number | null;
  grossSalary: number | null;
  // After save, computed:
  perDayAvg?: number;
  salaryRatio?: number;
  status?: string;
  notes?: string;
}

// ── Styles ─────────────────────────────────────────────────────────────────

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
function fmtPct(n: number) { return n.toFixed(2) + "%"; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    GOOD: { bg: "var(--green-bg)", color: "var(--green)", label: "GOOD" },
    IMPROVE: { bg: "var(--amber-bg)", color: "var(--amber)", label: "IMPROVE SALES" },
    POOR: { bg: "var(--red-bg)", color: "var(--red)", label: "POOR SALES" },
  };
  const s = map[status] ?? map.IMPROVE;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const now = new Date();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<Tab>("entry");

  // Entry tab
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [existingRecords, setExistingRecords] = useState<SalesRecord[]>([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number; warnings: string[] } | null>(null);

  // Dashboard tab
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Settings tab
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);
  const [editDefault, setEditDefault] = useState({ goodBelow: "6", improveBelow: "8" });
  const [deptOverride, setDeptOverride] = useState({ departmentId: "", goodBelow: "6", improveBelow: "8" });
  const [thresholdSaving, setThresholdSaving] = useState(false);

  // Load entities once
  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[]; departments: Department[] }) => {
        setEntities(opts.entities ?? []);
        setDepartments(opts.departments ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  // Load employees (Sales dept) for entry
  const fetchEmployees = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/employees?entityId=${entityId}&status=ACTIVE`)
      .then((r) => r.json())
      .then((data: Employee[]) => {
        const salesEmps = (data ?? []).filter(
          (e) => e.department?.name?.toLowerCase().includes("sales")
        );
        setEmployees(salesEmps);
      })
      .catch(() => {});
  }, [entityId]);

  // Load existing sales records for this month
  const fetchRecords = useCallback(() => {
    if (!entityId) return;
    setEntryLoading(true);
    fetch(`/api/performance?entityId=${entityId}&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((data: SalesRecord[]) => {
        setExistingRecords(data ?? []);
        setEntryLoading(false);
      })
      .catch(() => setEntryLoading(false));
  }, [entityId, month, year]);

  // Fetch payroll data to pre-fill worked days + gross salary for the entry grid
  const fetchPayrollForEntry = useCallback(async (emps: Employee[]) => {
    if (!entityId || emps.length === 0) return;
    try {
      const [payRes, attRes] = await Promise.all([
        fetch(`/api/payroll?entityId=${entityId}&month=${month}&year=${year}`).then((r) => r.json()) as Promise<{ details?: { employeeId: string; grossSalary: number }[] }>,
        fetch(`/api/attendance?entityId=${entityId}&month=${month}&year=${year}`).then((r) => r.json()).catch(() => ({ records: [] })) as Promise<{ records?: { employeeId: string; payableDays?: number | null }[] }>,
      ]);
      const payMap = new Map((payRes.details ?? []).map((d) => [d.employeeId, d.grossSalary]));
      const attMap = new Map((attRes.records ?? []).map((r) => [r.employeeId, Number(r.payableDays ?? 0)]));
      return { payMap, attMap };
    } catch { return undefined; }
  }, [entityId, month, year]);

  useEffect(() => {
    if (!entityId) return;
    fetchEmployees();
    fetchRecords();
  }, [entityId, month, year, fetchEmployees, fetchRecords]);

  // Build rows whenever employees or records change
  useEffect(() => {
    if (employees.length === 0) { setRows([]); return; }
    fetchPayrollForEntry(employees).then((maps) => {
      const recMap = new Map(existingRecords.map((r) => [r.employeeId, r]));
      const newRows: EntryRow[] = employees.map((emp) => {
        const rec = recMap.get(emp.id);
        const workedDays = maps?.attMap.get(emp.id) ?? null;
        const grossSalary = maps?.payMap.get(emp.id) ?? null;
        if (rec) {
          return {
            employee: emp,
            totalSales: String(rec.totalSales),
            workedDays: rec.workedDays,
            grossSalary: rec.grossSalary,
            perDayAvg: rec.perDayAvg,
            salaryRatio: rec.salaryRatio,
            status: rec.status,
            notes: rec.notes ?? undefined,
          };
        }
        return { employee: emp, totalSales: "", workedDays, grossSalary };
      });
      setRows(newRows);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, existingRecords]);

  // Dashboard data
  const fetchDashboard = useCallback(() => {
    if (!entityId) return;
    setDashLoading(true);
    Promise.all([
      fetch(`/api/performance/leaderboard?entityId=${entityId}&month=${month}&year=${year}`).then((r) => r.json()) as Promise<LeaderboardRecord[]>,
      fetch(`/api/performance/summary?entityId=${entityId}&month=${month}&year=${year}`).then((r) => r.json()) as Promise<SummaryData>,
    ])
      .then(([lb, sum]) => { setLeaderboard(lb ?? []); setSummary(sum); })
      .catch(() => {})
      .finally(() => setDashLoading(false));
  }, [entityId, month, year]);

  // Settings data
  const fetchThresholds = useCallback(() => {
    if (!entityId) return;
    setThresholdsLoading(true);
    fetch(`/api/performance/thresholds?entityId=${entityId}`)
      .then((r) => r.json())
      .then((data: Threshold[]) => {
        setThresholds(data ?? []);
        const def = (data ?? []).find((t) => t.departmentId === null);
        if (def) setEditDefault({ goodBelow: String(def.goodBelow), improveBelow: String(def.improveBelow) });
        setThresholdsLoading(false);
      })
      .catch(() => setThresholdsLoading(false));
  }, [entityId]);

  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    if (activeTab === "settings") fetchThresholds();
  }, [activeTab, fetchDashboard, fetchThresholds]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function updateSales(idx: number, val: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, totalSales: val } : r));
  }

  async function handleSave() {
    const toSave = rows.filter((r) => {
      const n = parseFloat(r.totalSales.replace(/,/g, ""));
      return !isNaN(n) && n > 0;
    });
    if (toSave.length === 0) { alert("Enter sales figures for at least one employee."); return; }
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId, month, year,
          records: toSave.map((r) => ({
            employeeId: r.employee.id,
            totalSales: parseFloat(r.totalSales.replace(/,/g, "")),
          })),
        }),
      });
      const result = await res.json() as { saved: number; skipped: number; warnings: string[] };
      setSaveResult(result);
      fetchRecords();
    } catch { alert("Network error"); } finally { setSaving(false); }
  }

  async function saveThreshold(departmentId: string | null, goodBelow: number, improveBelow: number) {
    if (goodBelow >= improveBelow) { alert("GOOD threshold must be less than IMPROVE threshold"); return; }
    setThresholdSaving(true);
    try {
      await fetch("/api/performance/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, departmentId, goodBelow, improveBelow }),
      });
      fetchThresholds();
    } catch { alert("Network error"); } finally { setThresholdSaving(false); }
  }

  async function deleteThreshold(departmentId: string) {
    if (!confirm("Delete this department override?")) return;
    await fetch(`/api/performance/thresholds?entityId=${entityId}&departmentId=${departmentId}`, { method: "DELETE" });
    fetchThresholds();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalSalesFmt = fmt(rows.reduce((s, r) => s + (parseFloat(r.totalSales.replace(/,/g, "")) || 0), 0));
  const existingStatCounts = existingRecords.reduce((a, r) => {
    if (r.status === "GOOD") a.GOOD++;
    else if (r.status === "IMPROVE") a.IMPROVE++;
    else if (r.status === "POOR") a.POOR++;
    return a;
  }, { GOOD: 0, IMPROVE: 0, POOR: 0 });

  const TABS: { id: Tab; label: string }[] = [
    { id: "entry", label: "Sales Entry" },
    { id: "dashboard", label: "Dashboard" },
    { id: "settings", label: "Settings" },
  ];

  const monthYearBar = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ ...btnSecondary, appearance: "none" }}>
        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
      <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ ...btnSecondary, appearance: "none" }}>
        {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ maxWidth: 1600 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Performance</h1>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ ...btnSecondary, appearance: "none" }}>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={btnSecondary} onClick={() => {
          if (activeTab === "entry") { fetchEmployees(); fetchRecords(); }
          if (activeTab === "dashboard") fetchDashboard();
          if (activeTab === "settings") fetchThresholds();
        }}>Refresh</button>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: "var(--radius-xs) var(--radius-xs) 0 0", background: "var(--glass)", border: "1px solid var(--glass-border)", borderBottom: "none", flexWrap: "wrap" }}>
        {monthYearBar}
        {activeTab === "entry" && (
          <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Computing…" : "Compute & Save"}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {saveResult && (
          <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
            ✓ Saved {saveResult.saved} records{saveResult.skipped > 0 ? `, skipped ${saveResult.skipped}` : ""}
          </span>
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

        {/* ── SALES ENTRY TAB ─────────────────────────────────────────── */}
        {activeTab === "entry" && (
          <div>
            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 16, borderBottom: "1px solid var(--glass-border)" }}>
              <MetricCard color="blue" icon={<Users size={16} />} value={String(employees.length)} label="Sales Employees" />
              <MetricCard color="green" icon={<IndianRupee size={16} />} value={`₹${totalSalesFmt}`} label="Total Sales (entered)" />
              <MetricCard color="amber" icon={<TrendingUp size={16} />} value={`${existingStatCounts.GOOD}G / ${existingStatCounts.IMPROVE}I / ${existingStatCounts.POOR}P`} label="Good / Improve / Poor" />
              <MetricCard color="purple" icon={<CheckCircle size={16} />} value={String(existingRecords.length)} label="Records Saved" />
            </div>

            {entryLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
            ) : employees.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
                No Sales department employees found for this entity.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thBase}>Code</th>
                      <th style={thBase}>Name</th>
                      <th style={thBase}>Location</th>
                      <th style={thBase}>Sub-Dept</th>
                      <th style={thR}>Total Sales (₹)</th>
                      <th style={thR}>Worked Days</th>
                      <th style={thR}>Gross Salary (₹)</th>
                      {existingRecords.length > 0 && <>
                        <th style={thR}>Per Day Avg (₹)</th>
                        <th style={thR}>Ratio %</th>
                        <th style={{ ...thBase, textAlign: "center" }}>Status</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.employee.id}
                        style={{ background: row.status === "GOOD" ? "rgba(34,197,94,0.04)" : row.status === "POOR" ? "rgba(239,68,68,0.04)" : "transparent" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = row.status === "GOOD" ? "rgba(34,197,94,0.04)" : row.status === "POOR" ? "rgba(239,68,68,0.04)" : "transparent"; }}
                      >
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{row.employee.employeeCode}</td>
                        <td style={{ ...tdBase, fontWeight: 500, color: "var(--text-1)" }}>{row.employee.fullName}</td>
                        <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{row.employee.location?.name ?? "—"}</td>
                        <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{row.employee.subDepartment?.name ?? "—"}</td>
                        <td style={tdR}>
                          <input
                            type="text"
                            value={row.totalSales}
                            onChange={(e) => updateSales(idx, e.target.value)}
                            onFocus={(e) => { e.target.value = row.totalSales.replace(/,/g, ""); }}
                            onBlur={(e) => {
                              const n = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                              updateSales(idx, n > 0 ? n.toLocaleString("en-IN") : "");
                            }}
                            placeholder="0"
                            style={{
                              width: 110, padding: "4px 8px", textAlign: "right",
                              background: "var(--bg-2)", border: "1px solid var(--glass-border)",
                              borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 12,
                            }}
                          />
                        </td>
                        <td style={{ ...tdR, color: row.workedDays == null ? "var(--text-4)" : "var(--text-2)", background: "var(--bg-2)" }}>
                          {row.workedDays != null ? row.workedDays : "—"}
                        </td>
                        <td style={{ ...tdR, color: row.grossSalary == null ? "var(--text-4)" : "var(--text-2)", background: "var(--bg-2)" }}>
                          {row.grossSalary != null ? fmt(row.grossSalary) : "—"}
                        </td>
                        {existingRecords.length > 0 && <>
                          <td style={{ ...tdR, color: "var(--blue)", fontWeight: 600 }}>
                            {row.perDayAvg != null ? `₹${fmt(Math.round(row.perDayAvg))}` : "—"}
                          </td>
                          <td style={{ ...tdR, color: row.salaryRatio != null ? (row.salaryRatio < 6 ? "var(--green)" : row.salaryRatio < 8 ? "var(--amber)" : "var(--red)") : "var(--text-4)", fontWeight: 600 }}>
                            {row.salaryRatio != null ? fmtPct(row.salaryRatio) : "—"}
                          </td>
                          <td style={{ ...tdBase, textAlign: "center" }}>
                            {row.status ? <StatusBadge status={row.status} /> : "—"}
                          </td>
                        </>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {saveResult?.warnings && saveResult.warnings.length > 0 && (
              <div style={{ padding: "10px 16px", background: "var(--amber-bg)", borderTop: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>Warnings: </span>
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>{saveResult.warnings.join(" · ")}</span>
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD TAB ────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          dashLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
          ) : !summary || leaderboard.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
              No performance data for {MONTHS[month - 1]} {year}. Enter sales data first.
            </div>
          ) : (
            <div>
              {/* Metric cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 16, borderBottom: "1px solid var(--glass-border)" }}>
                <MetricCard color="blue" icon={<IndianRupee size={16} />} value={`₹${fmt(Math.round(summary.totalSales))}`} label="Total Sales" />
                <MetricCard color="amber" icon={<TrendingUp size={16} />} value={fmtPct(summary.avgRatio)} label="Avg Salary-to-Sales %" />
                <MetricCard color="green" icon={<CheckCircle size={16} />} value={String(summary.statusCounts.GOOD)} label="GOOD Performers" />
                <MetricCard color="red" icon={<AlertTriangle size={16} />} value={String(summary.statusCounts.POOR)} label="POOR Performers" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 0 }}>
                {/* Leaderboard */}
                <div style={{ borderRight: "1px solid var(--glass-border)" }}>
                  <div style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--text-2)", borderBottom: "1px solid var(--glass-border)" }}>
                    Leaderboard — Top {leaderboard.length}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...thBase, width: 40 }}>#</th>
                          <th style={thBase}>Employee</th>
                          <th style={thBase}>Location</th>
                          <th style={thBase}>Sub-Dept</th>
                          <th style={thR}>Sales (₹)</th>
                          <th style={thR}>Per Day (₹)</th>
                          <th style={thR}>Ratio %</th>
                          <th style={{ ...thBase, textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((r) => (
                          <tr key={r.id}
                            style={{ background: r.status === "GOOD" ? "rgba(34,197,94,0.05)" : r.status === "POOR" ? "rgba(239,68,68,0.05)" : "transparent" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = r.status === "GOOD" ? "rgba(34,197,94,0.05)" : r.status === "POOR" ? "rgba(239,68,68,0.05)" : "transparent"; }}
                          >
                            <td style={{ ...tdBase, fontWeight: 700, color: r.rank <= 3 ? "var(--amber)" : "var(--text-4)", width: 40 }}>{r.rank}</td>
                            <td style={{ ...tdBase }}>
                              <div style={{ fontWeight: 500, color: "var(--text-1)" }}>{r.employee.fullName}</div>
                              <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "monospace" }}>{r.employee.employeeCode}</div>
                            </td>
                            <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{r.employee.location?.name ?? "—"}</td>
                            <td style={{ ...tdBase, color: "var(--text-3)", fontSize: 11 }}>{r.employee.subDepartment?.name ?? "—"}</td>
                            <td style={{ ...tdR, fontWeight: 600 }}>₹{fmt(Math.round(r.totalSales))}</td>
                            <td style={{ ...tdR, color: "var(--blue)", fontWeight: 600 }}>₹{fmt(Math.round(r.perDayAvg))}</td>
                            <td style={{ ...tdR, fontWeight: 600, color: r.salaryRatio < 6 ? "var(--green)" : r.salaryRatio < 8 ? "var(--amber)" : "var(--red)" }}>{fmtPct(r.salaryRatio)}</td>
                            <td style={{ ...tdBase, textAlign: "center" }}><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right panel: Location + Sub-dept breakdown */}
                <div>
                  {/* Location cards */}
                  <div style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--text-2)", borderBottom: "1px solid var(--glass-border)" }}>
                    By Location
                  </div>
                  <div style={{ padding: 12, display: "grid", gap: 8 }}>
                    {summary.byLocation.map((loc) => (
                      <div key={loc.locationId} style={{ padding: "12px 14px", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{loc.locationName}</span>
                          <span style={{ fontSize: 10, color: "var(--text-4)" }}>{loc.count} emp</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--blue)", margin: "4px 0" }}>₹{fmt(Math.round(loc.totalSales))}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                          <span style={{ color: "var(--text-3)" }}>Avg ratio: <span style={{ fontWeight: 700, color: loc.avgRatio < 6 ? "var(--green)" : loc.avgRatio < 8 ? "var(--amber)" : "var(--red)" }}>{fmtPct(loc.avgRatio)}</span></span>
                          <span style={{ color: "var(--green)" }}>{loc.statusCounts.GOOD}G</span>
                          <span style={{ color: "var(--amber)" }}>{loc.statusCounts.IMPROVE}I</span>
                          <span style={{ color: "var(--red)" }}>{loc.statusCounts.POOR}P</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sub-dept table */}
                  {summary.bySubDepartment.length > 0 && (
                    <>
                      <div style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--text-2)", borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)" }}>
                        By Sub-Department
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={thBase}>Sub-Dept</th>
                            <th style={thR}>Total Sales</th>
                            <th style={thR}>Avg Ratio</th>
                            <th style={{ ...thBase, textAlign: "center" }}>Emp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.bySubDepartment.map((s) => (
                            <tr key={s.subDeptId} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                              <td style={tdBase}>{s.subDeptName}</td>
                              <td style={tdR}>₹{fmt(Math.round(s.totalSales))}</td>
                              <td style={{ ...tdR, color: s.avgRatio < 6 ? "var(--green)" : s.avgRatio < 8 ? "var(--amber)" : "var(--red)", fontWeight: 600 }}>{fmtPct(s.avgRatio)}</td>
                              <td style={{ ...tdBase, textAlign: "center", color: "var(--text-3)" }}>{s.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          thresholdsLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
          ) : (
            <div style={{ padding: 24, maxWidth: 700 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 16 }}>Performance Thresholds</h2>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20 }}>
                Salary-to-Sales ratio determines performance status. Lower ratio = better performance.
                <br />GOOD: ratio &lt; goodBelow% · IMPROVE: ratio &lt; improveBelow% · POOR: ratio ≥ improveBelow%
              </p>

              {/* Default threshold */}
              <div style={{ padding: 20, background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 14 }}>Entity Default (applies to all departments)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>GOOD below (%)</label>
                    <input
                      type="number" step="0.1" min="0" max="100"
                      value={editDefault.goodBelow}
                      onChange={(e) => setEditDefault((d) => ({ ...d, goodBelow: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", background: "var(--bg-2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>IMPROVE below (%)</label>
                    <input
                      type="number" step="0.1" min="0" max="100"
                      value={editDefault.improveBelow}
                      onChange={(e) => setEditDefault((d) => ({ ...d, improveBelow: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", background: "var(--bg-2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <button
                    style={{ ...btnPrimary, opacity: thresholdSaving ? 0.7 : 1 }}
                    disabled={thresholdSaving}
                    onClick={() => saveThreshold(null, parseFloat(editDefault.goodBelow), parseFloat(editDefault.improveBelow))}
                  >Save</button>
                </div>
              </div>

              {/* Department overrides */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 12 }}>Department Overrides</div>
              <div style={{ padding: 20, background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Department</label>
                    <select
                      value={deptOverride.departmentId}
                      onChange={(e) => setDeptOverride((d) => ({ ...d, departmentId: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", background: "var(--bg-2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box", appearance: "none" }}
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>GOOD below (%)</label>
                    <input type="number" step="0.1" value={deptOverride.goodBelow} onChange={(e) => setDeptOverride((d) => ({ ...d, goodBelow: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", background: "var(--bg-2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4 }}>IMPROVE below (%)</label>
                    <input type="number" step="0.1" value={deptOverride.improveBelow} onChange={(e) => setDeptOverride((d) => ({ ...d, improveBelow: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", background: "var(--bg-2)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", color: "var(--text-1)", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <button
                    style={{ ...btnPrimary, opacity: !deptOverride.departmentId || thresholdSaving ? 0.5 : 1 }}
                    disabled={!deptOverride.departmentId || thresholdSaving}
                    onClick={() => saveThreshold(deptOverride.departmentId, parseFloat(deptOverride.goodBelow), parseFloat(deptOverride.improveBelow))}
                  >Add</button>
                </div>
              </div>

              {/* Existing overrides */}
              {thresholds.filter((t) => t.departmentId !== null).length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thBase}>Department</th>
                      <th style={thR}>GOOD below</th>
                      <th style={thR}>IMPROVE below</th>
                      <th style={thBase}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {thresholds.filter((t) => t.departmentId !== null).map((t) => (
                      <tr key={t.id} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <td style={tdBase}>{t.department?.name ?? t.departmentId}</td>
                        <td style={{ ...tdR, color: "var(--green)", fontWeight: 600 }}>{t.goodBelow}%</td>
                        <td style={{ ...tdR, color: "var(--amber)", fontWeight: 600 }}>{t.improveBelow}%</td>
                        <td style={tdBase}>
                          <button style={{ ...btnSecondary, fontSize: 11, color: "var(--red)" }} onClick={() => deleteThreshold(t.departmentId!)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
