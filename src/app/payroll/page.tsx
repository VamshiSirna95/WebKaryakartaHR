"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, Users, TrendingDown, Wallet, Lock } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

interface PayrollDetail {
  id: string;
  employeeId: string;
  payableDays: number;
  earnedBasic: number;
  earnedHra: number;
  earnedSpecial: number;
  grossSalary: number;
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  totalDeductions: number;
  netSalary: number;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: { name: string } | null;
  };
}

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

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function StatusBadge({ status }: { status: "DRAFT" | "PROCESSED" | "LOCKED" }) {
  const styles: Record<string, React.CSSProperties> = {
    DRAFT: { background: "var(--amber-bg)", color: "var(--amber)" },
    PROCESSED: { background: "var(--blue-bg)", color: "var(--blue)" },
    LOCKED: { background: "var(--green-bg)", color: "var(--green)" },
  };
  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      ...styles[status],
    }}>
      {status === "LOCKED" && <Lock size={10} />}
      ● {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

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
    const params = new URLSearchParams({
      entityId,
      year: String(year),
      month: String(month),
    });
    fetch(`/api/payroll?${params}`)
      .then((r) => r.json())
      .then((data: { run: PayrollRun | null; details: PayrollDetail[] }) => {
        setRun(data.run);
        setDetails(data.details ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityId, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } catch {
      /* ignore */
    } finally {
      setProcessing(false);
    }
  }

  async function handleLock() {
    if (!run) return;
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
    } catch {
      /* ignore */
    } finally {
      setLocking(false);
    }
  }

  const filteredLocations = locations.filter((l) => !entityId || l.entityId === entityId);

  // Apply location filter to details if selected
  const visibleDetails = details;

  // Totals
  const totals = visibleDetails.reduce(
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
    {
      payableDays: 0, earnedBasic: 0, earnedHra: 0, earnedSpecial: 0,
      grossSalary: 0, pfEmployee: 0, esiEmployee: 0, professionalTax: 0,
      totalDeductions: 0, netSalary: 0,
    }
  );

  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--glass-border)",
    background: "var(--bg-2)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 12,
    color: "var(--text-2)",
    borderBottom: "1px solid var(--glass-border)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ maxWidth: 1600 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Payroll</h1>

        {/* Entity select */}
        <select
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
          ))}
        </select>

        {/* Location filter */}
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          <option value="all">All Locations</option>
          {filteredLocations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Month select */}
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Year select */}
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard
          color="amber"
          icon={<IndianRupee size={16} />}
          value={run ? fmtRupee(run.totalGross) : "₹0"}
          label="Total Gross"
        />
        <MetricCard
          color="red"
          icon={<TrendingDown size={16} />}
          value={run ? fmtRupee(run.totalDeductions) : "₹0"}
          label="Total Deductions"
        />
        <MetricCard
          color="green"
          icon={<Wallet size={16} />}
          value={run ? fmtRupee(run.totalNet) : "₹0"}
          label="Net Pay"
        />
        <MetricCard
          color="blue"
          icon={<Users size={16} />}
          value={run ? String(run.employeeCount) : "0"}
          label="Employees"
        />
      </div>

      {/* Action bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        padding: "12px 16px",
        borderRadius: "var(--radius-xs)",
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        flexWrap: "wrap",
      }}>
        <button
          style={processing ? { ...btnAmber, opacity: 0.7, cursor: "not-allowed" } : btnAmber}
          disabled={processing || run?.status === "LOCKED"}
          onClick={handleProcess}
        >
          {processing ? "Processing…" : "Process Payroll"}
        </button>

        {run?.status === "PROCESSED" && (
          <button
            style={locking ? { ...btnSecondary, opacity: 0.7, cursor: "not-allowed" } : btnSecondary}
            disabled={locking}
            onClick={handleLock}
          >
            {locking ? "Locking…" : "Lock Payroll"}
          </button>
        )}

        <button
          style={btnSecondary}
          onClick={() => console.log("Export Excel — coming in Session 4B")}
        >
          Export Excel
        </button>

        <div style={{ flex: 1 }} />

        {run && <StatusBadge status={run.status} />}
        {!run && (
          <span style={{
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: "var(--glass)",
            color: "var(--text-3)",
          }}>
            ● Not Processed
          </span>
        )}

        <button style={btnPrimary} onClick={fetchData} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Salary Register Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
            Loading payroll data…
          </div>
        ) : visibleDetails.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
            {run ? "No employee details found." : "Click \u201cProcess Payroll\u201d to generate the salary register."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Code</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Name</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Dept</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Basic</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>HRA</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Special</th>
                  <th style={{ ...thStyle, textAlign: "right", background: "rgba(255,159,10,0.06)", color: "var(--amber)" }}>Gross</th>
                  <th style={{ ...thStyle, textAlign: "right", color: "var(--red)" }}>PF</th>
                  <th style={{ ...thStyle, textAlign: "right", color: "var(--red)" }}>ESI</th>
                  <th style={{ ...thStyle, textAlign: "right", color: "var(--red)" }}>PT</th>
                  <th style={{ ...thStyle, textAlign: "right", background: "rgba(255,69,58,0.06)", color: "var(--red)" }}>Deductions</th>
                  <th style={{ ...thStyle, textAlign: "right", background: "rgba(52,199,89,0.06)", color: "var(--green)" }}>Net Pay</th>
                  <th style={{ ...thStyle, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleDetails.map((d) => (
                  <tr key={d.id} style={{ transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ ...tdStyle, color: "var(--text-3)", fontFamily: "monospace", fontSize: 11 }}>
                      {d.employee.employeeCode}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "var(--text-1)" }}>
                      {d.employee.fullName}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--text-3)" }}>
                      {d.employee.department?.name ?? "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {d.payableDays}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {fmt(d.earnedBasic)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {fmt(d.earnedHra)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {fmt(d.earnedSpecial)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", background: "rgba(255,159,10,0.04)", color: "var(--amber)", fontWeight: 600 }}>
                      {fmt(d.grossSalary)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--red)" }}>
                      {fmt(d.pfEmployee)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--red)" }}>
                      {fmt(d.esiEmployee)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--red)" }}>
                      {fmt(d.professionalTax)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", background: "rgba(255,69,58,0.04)", color: "var(--red)", fontWeight: 600 }}>
                      {fmt(d.totalDeductions)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", background: "rgba(52,199,89,0.04)", color: "var(--green)", fontWeight: 700 }}>
                      {fmt(d.netSalary)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer" }}>View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ background: "var(--bg-2)" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
                    TOTALS ({visibleDetails.length} employees)
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>
                    {totals.payableDays.toFixed(1)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.earnedBasic)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.earnedHra)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.earnedSpecial)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--amber)", background: "rgba(255,159,10,0.06)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.grossSalary)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.pfEmployee)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.esiEmployee)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--red)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.professionalTax)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--red)", background: "rgba(255,69,58,0.06)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.totalDeductions)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "var(--green)", background: "rgba(52,199,89,0.06)", borderTop: "2px solid var(--glass-border)" }}>
                    {fmt(totals.netSalary)}
                  </td>
                  <td style={{ ...tdStyle, borderTop: "2px solid var(--glass-border)" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      {run && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            {MONTHS[month - 1]} {year}
            {run.processedAt && ` · Processed: ${new Date(run.processedAt).toLocaleDateString("en-IN")}`}
            {run.lockedAt && ` · Locked: ${new Date(run.lockedAt).toLocaleDateString("en-IN")}`}
          </span>
        </div>
      )}
    </div>
  );
}
