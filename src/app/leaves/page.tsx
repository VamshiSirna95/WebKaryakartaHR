"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, CheckCircle, Clock, Users } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { LeaveApplyModal } from "@/components/LeaveApplyModal";

type Tab = "requests" | "balances" | "types";

interface Entity { id: string; code: string; name: string; }

interface LeaveRequest {
  id: string;
  days: number;
  reason: string;
  status: string;
  fromDate: string;
  toDate: string;
  isHalfDay: boolean;
  halfDayType: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  employee: { id: string; employeeCode: string; fullName: string; department: { name: string } | null };
  leaveType: { code: string; name: string };
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  annualQuota: number;
  carryForwardMax: number;
  isPaid: boolean;
  applicableGender: string | null;
  maxConsecutiveDays: number | null;
  isActive: boolean;
  requiresApproval: boolean;
}

interface EmployeeBalance {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string | null;
  location: string | null;
  balances: Array<{ leaveTypeCode: string; leaveTypeName: string; annualQuota: number; opening: number; credited: number; used: number; balance: number }>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--glass)", border: "1px solid var(--glass-border)",
  color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
  transition: "var(--transition)",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "var(--radius-xs)",
  background: "var(--blue)", border: "none",
  color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
  transition: "var(--transition)",
};
const btnGreen: React.CSSProperties = {
  padding: "4px 10px", borderRadius: "var(--radius-xs)",
  background: "var(--green-bg)", border: "1px solid var(--glass-border)",
  color: "var(--green)", fontSize: 11, fontWeight: 600, cursor: "pointer",
};
const btnRed: React.CSSProperties = {
  padding: "4px 10px", borderRadius: "var(--radius-xs)",
  background: "var(--red-bg)", border: "1px solid var(--glass-border)",
  color: "var(--red)", fontSize: 11, fontWeight: 600, cursor: "pointer",
};
const thBase: React.CSSProperties = {
  padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", textAlign: "left",
};
const tdBase: React.CSSProperties = {
  padding: "9px 12px", fontSize: 12, color: "var(--text-2)",
  borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  PENDING: { background: "var(--amber-bg)", color: "var(--amber)" },
  APPROVED: { background: "var(--green-bg)", color: "var(--green)" },
  REJECTED: { background: "var(--red-bg)", color: "var(--red)" },
  CANCELLED: { background: "var(--glass)", color: "var(--text-3)" },
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  CL: "var(--blue)", SL: "var(--amber)", EL: "var(--green)",
  PL: "var(--purple)", ML: "var(--red)", PTL: "var(--red)", LOP: "var(--text-3)",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, ...STATUS_STYLES[status] ?? {} }}>
      {status}
    </span>
  );
}

function LeaveTypeBadge({ code }: { code: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: "var(--glass)", color: LEAVE_TYPE_COLORS[code] ?? "var(--text-2)", border: "1px solid var(--glass-border)" }}>
      {code}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function LeavesPage() {
  const now = new Date();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [year, setYear] = useState(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);

  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balanceData, setBalanceData] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[] }) => {
        setEntities(opts.entities ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchRequests = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    const p = new URLSearchParams({ entityId, status: statusFilter });
    fetch(`/api/leaves/requests?${p}`)
      .then((r) => r.json())
      .then((data: LeaveRequest[]) => { setRequests(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entityId, statusFilter]);

  const fetchTypes = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/leaves/types?entityId=${entityId}`)
      .then((r) => r.json())
      .then((data: LeaveType[]) => setLeaveTypes(data ?? []))
      .catch(() => {});
  }, [entityId]);

  const fetchBalances = useCallback(() => {
    if (!entityId) return;
    fetch(`/api/leaves/balances?entityId=${entityId}&year=${year}`)
      .then((r) => r.json())
      .then((data: { employees: EmployeeBalance[] }) => setBalanceData(data.employees ?? []))
      .catch(() => {});
  }, [entityId, year]);

  useEffect(() => { fetchRequests(); fetchTypes(); fetchBalances(); }, [fetchRequests, fetchTypes, fetchBalances]);

  async function handleAction(id: string, action: "APPROVE" | "REJECT" | "CANCEL", rejectionReason?: string) {
    setActioning(id);
    try {
      const res = await fetch(`/api/leaves/${id}/action`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvedBy: "HR Admin", rejectionReason }),
      });
      if (!res.ok) { const e = await res.json() as { error?: string }; alert(e.error ?? "Action failed"); return; }
      fetchRequests();
      fetchBalances();
      setRejectingId(null);
      setRejectReason("");
    } catch { alert("Network error"); } finally { setActioning(null); }
  }

  // Metrics
  const pending = requests.filter((r) => r.status === "PENDING").length;
  const approvedThisMonth = requests.filter((r) => r.status === "APPROVED" && new Date(r.fromDate).getMonth() === now.getMonth()).length;
  const totalUsed = balanceData.reduce((sum, emp) => sum + emp.balances.reduce((s, b) => s + b.used, 0), 0);
  const avgBalance = balanceData.length > 0
    ? (balanceData.reduce((sum, emp) => sum + emp.balances.reduce((s, b) => s + b.balance, 0), 0) / balanceData.length).toFixed(1)
    : "0";

  // Unique leave type codes from balances
  const balanceCodes = Array.from(new Set(balanceData.flatMap((e) => e.balances.map((b) => b.leaveTypeCode)))).sort();

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.employee.fullName.toLowerCase().includes(q) || r.employee.employeeCode.toLowerCase().includes(q);
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: "requests", label: "Requests" },
    { id: "balances", label: "Balances" },
    { id: "types", label: "Leave Types" },
  ];

  return (
    <div style={{ maxWidth: 1600 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Leaves</h1>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>)}
        </select>
        <input
          placeholder="Search employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...btnSecondary, cursor: "text", minWidth: 160 }}
        />
        <div style={{ flex: 1 }} />
        <button style={btnPrimary} onClick={() => setShowApplyModal(true)}>+ Apply Leave</button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard color="amber" icon={<Clock size={16} />} value={String(pending)} label="Pending Requests" />
        <MetricCard color="green" icon={<CheckCircle size={16} />} value={String(approvedThisMonth)} label="Approved This Month" />
        <MetricCard color="blue" icon={<CalendarDays size={16} />} value={String(totalUsed)} label="Total Leaves Used (FY)" />
        <MetricCard color="purple" icon={<Users size={16} />} value={avgBalance} label="Avg Balance per Employee" />
      </div>

      {/* Action bar + Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: "var(--radius-xs) var(--radius-xs) 0 0", background: "var(--glass)", border: "1px solid var(--glass-border)", borderBottom: "none", flexWrap: "wrap" }}>
        {activeTab === "requests" && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}>
            {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <button style={btnSecondary} onClick={() => { fetchRequests(); fetchBalances(); fetchTypes(); }}>Refresh</button>
      </div>

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
              {tab.id === "requests" && pending > 0 && (
                <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "var(--amber-bg)", color: "var(--amber)" }}>{pending}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="glass-card" style={{ overflow: "hidden", borderRadius: "0 0 var(--radius) var(--radius)" }}>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
        ) : activeTab === "requests" ? (
          /* Requests Tab */
          filteredRequests.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>No leave requests found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thBase}>Employee</th>
                    <th style={thBase}>Type</th>
                    <th style={thBase}>From</th>
                    <th style={thBase}>To</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Days</th>
                    <th style={thBase}>Reason</th>
                    <th style={thBase}>Status</th>
                    <th style={thBase}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={tdBase}>
                        <div style={{ fontWeight: 500, color: "var(--text-1)" }}>{req.employee.fullName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>{req.employee.employeeCode}</div>
                      </td>
                      <td style={tdBase}><LeaveTypeBadge code={req.leaveType.code} /></td>
                      <td style={tdBase}>{fmtDate(req.fromDate)}</td>
                      <td style={tdBase}>{fmtDate(req.toDate)}</td>
                      <td style={{ ...tdBase, textAlign: "center", fontWeight: 600 }}>
                        {req.days}{req.isHalfDay && <span style={{ fontSize: 9, color: "var(--text-4)", marginLeft: 2 }}>({req.halfDayType?.replace("_", " ")})</span>}
                      </td>
                      <td style={{ ...tdBase, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{req.reason}</td>
                      <td style={tdBase}><StatusBadge status={req.status} /></td>
                      <td style={tdBase}>
                        {req.status === "PENDING" && rejectingId !== req.id && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={actioning === req.id ? { ...btnGreen, opacity: 0.5 } : btnGreen} disabled={actioning === req.id} onClick={() => handleAction(req.id, "APPROVE")}>Approve</button>
                            <button style={btnRed} onClick={() => { setRejectingId(req.id); setRejectReason(""); }}>Reject</button>
                          </div>
                        )}
                        {req.status === "PENDING" && rejectingId === req.id && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason…"
                              style={{ padding: "4px 8px", borderRadius: "var(--radius-xs)", background: "var(--bg-2)", border: "1px solid var(--glass-border)", color: "var(--text-1)", fontSize: 11, width: 120 }}
                            />
                            <button style={btnRed} disabled={!rejectReason || actioning === req.id} onClick={() => handleAction(req.id, "REJECT", rejectReason)}>Confirm</button>
                            <button style={btnSecondary} onClick={() => setRejectingId(null)}>✕</button>
                          </div>
                        )}
                        {req.status === "APPROVED" && (
                          <button style={{ ...btnSecondary, fontSize: 11 }} onClick={() => handleAction(req.id, "CANCEL")}>Cancel</button>
                        )}
                        {req.rejectionReason && (
                          <div style={{ fontSize: 10, color: "var(--red)", marginTop: 2 }}>{req.rejectionReason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "balances" ? (
          /* Balances Tab */
          balanceData.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>No balance data found. Seed leave balances first.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thBase}>Employee</th>
                    <th style={thBase}>Dept</th>
                    <th style={thBase}>Loc</th>
                    {balanceCodes.map((code) => {
                      const quota = balanceData[0]?.balances.find((b) => b.leaveTypeCode === code)?.annualQuota ?? 0;
                      return <th key={code} style={{ ...thBase, textAlign: "center" }}>{code} ({quota})</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {balanceData.map((emp) => (
                    <tr key={emp.id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={tdBase}>
                        <div style={{ fontWeight: 500, color: "var(--text-1)" }}>{emp.fullName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>{emp.employeeCode}</div>
                      </td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{emp.department ?? "—"}</td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{emp.location ?? "—"}</td>
                      {balanceCodes.map((code) => {
                        const b = emp.balances.find((bal) => bal.leaveTypeCode === code);
                        if (!b) return <td key={code} style={{ ...tdBase, textAlign: "center", color: "var(--text-4)" }}>—</td>;
                        const pct = b.credited > 0 ? b.balance / b.credited : 1;
                        const color = pct > 0.5 ? "var(--green)" : pct > 0.25 ? "var(--amber)" : "var(--red)";
                        return (
                          <td key={code} style={{ ...tdBase, textAlign: "center" }}>
                            <span style={{ fontWeight: 600, color, fontSize: 12 }}>{b.used}/{b.credited}</span>
                            <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: 4 }}>({b.balance} left)</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-2)" }}>
                    <td colSpan={3} style={{ ...tdBase, fontWeight: 700, color: "var(--text-1)", borderTop: "2px solid var(--glass-border)" }}>TOTALS ({balanceData.length} employees)</td>
                    {balanceCodes.map((code) => {
                      const used = balanceData.reduce((s, e) => s + (e.balances.find((b) => b.leaveTypeCode === code)?.used ?? 0), 0);
                      const credited = balanceData.reduce((s, e) => s + (e.balances.find((b) => b.leaveTypeCode === code)?.credited ?? 0), 0);
                      return <td key={code} style={{ ...tdBase, textAlign: "center", fontWeight: 700, borderTop: "2px solid var(--glass-border)" }}>{used}/{credited}</td>;
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          /* Leave Types Tab */
          leaveTypes.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>No leave types configured. Seed leave types first.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thBase}>Code</th>
                    <th style={thBase}>Name</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Annual Quota</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Carry Forward</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Paid</th>
                    <th style={thBase}>Gender</th>
                    <th style={thBase}>Max Consecutive</th>
                    <th style={thBase}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt) => (
                    <tr key={lt.id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={tdBase}><LeaveTypeBadge code={lt.code} /></td>
                      <td style={{ ...tdBase, color: "var(--text-1)", fontWeight: 500 }}>{lt.name}</td>
                      <td style={{ ...tdBase, textAlign: "center", fontWeight: 600 }}>{lt.annualQuota}</td>
                      <td style={{ ...tdBase, textAlign: "center" }}>{lt.carryForwardMax > 0 ? lt.carryForwardMax : "—"}</td>
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: lt.isPaid ? "var(--green-bg)" : "var(--amber-bg)", color: lt.isPaid ? "var(--green)" : "var(--amber)" }}>
                          {lt.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{lt.applicableGender ?? "All"}</td>
                      <td style={{ ...tdBase, color: "var(--text-3)" }}>{lt.maxConsecutiveDays ?? "No limit"}</td>
                      <td style={tdBase}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: lt.isActive ? "var(--green-bg)" : "var(--glass)", color: lt.isActive ? "var(--green)" : "var(--text-3)" }}>
                          {lt.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showApplyModal && (
        <LeaveApplyModal
          entityId={entityId}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => { fetchRequests(); fetchBalances(); }}
        />
      )}
    </div>
  );
}
