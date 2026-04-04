"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  annualQuota: number;
  isActive: boolean;
}

interface LeaveBalance {
  leaveTypeCode: string;
  balance: number;
  credited: number;
  used: number;
}

interface Props {
  entityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeaveApplyModal({ entityId, onClose, onSuccess }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState("FIRST_HALF");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/employees?entityId=${entityId}`)
      .then((r) => r.json())
      .then((emps: Employee[]) => setEmployees(emps ?? []))
      .catch(() => {});
    fetch(`/api/leaves/types?entityId=${entityId}`)
      .then((r) => r.json())
      .then((types: LeaveType[]) => setLeaveTypes((types ?? []).filter((t) => t.isActive)))
      .catch(() => {});
  }, [entityId]);

  // Fetch balance when employee + leave type selected
  useEffect(() => {
    if (!employeeId) { setBalances([]); return; }
    const year = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    fetch(`/api/leaves/balances?entityId=${entityId}&year=${year}`)
      .then((r) => r.json())
      .then((data: { employees: Array<{ id: string; balances: LeaveBalance[] }> }) => {
        const emp = data.employees?.find((e) => e.id === employeeId);
        setBalances(emp?.balances ?? []);
      })
      .catch(() => {});
  }, [employeeId, entityId]);

  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
  const currentBalance = balances.find((b) => b.leaveTypeCode === selectedType?.code);

  function calcDays(): number {
    if (isHalfDay) return 0.5;
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) return 0;
    const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  }

  const days = calcDays();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!employeeId || !leaveTypeId || !fromDate || !toDate || !reason) {
      setError("All fields are required");
      return;
    }
    if (days <= 0) { setError("Invalid date range"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, leaveTypeId, entityId, fromDate, toDate, days, reason, isHalfDay, halfDayType: isHalfDay ? halfDayType : undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to apply leave"); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: "var(--radius-xs)",
    background: "var(--bg-2)", border: "1px solid var(--glass-border)",
    color: "var(--text-1)", fontSize: 13, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Apply Leave</div>
          <button onClick={onClose} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", padding: "6px 8px", color: "var(--text-3)", cursor: "pointer" }}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelStyle}>Employee</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle} required>
                <option value="">Select employee…</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employeeCode} — {emp.fullName}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Leave Type</label>
              <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} style={inputStyle} required>
                <option value="">Select leave type…</option>
                {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
              </select>
              {currentBalance && (
                <div style={{ fontSize: 11, marginTop: 4, color: currentBalance.balance > 0 ? "var(--green)" : "var(--red)" }}>
                  Balance: {currentBalance.balance} days ({currentBalance.used} used of {currentBalance.credited})
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); if (!isHalfDay && !toDate) setToDate(e.target.value); }} style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={isHalfDay} onChange={(e) => { setIsHalfDay(e.target.checked); if (e.target.checked && fromDate) setToDate(fromDate); }} />
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>Half Day</span>
              </label>
              {isHalfDay && (
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {["FIRST_HALF", "SECOND_HALF"].map((v) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-2)" }}>
                      <input type="radio" name="halfDayType" value={v} checked={halfDayType === v} onChange={() => setHalfDayType(v)} />
                      {v === "FIRST_HALF" ? "First Half" : "Second Half"}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "8px 12px", background: "var(--glass)", borderRadius: "var(--radius-xs)", fontSize: 12, color: "var(--text-2)" }}>
              Days: <strong style={{ color: "var(--text-1)" }}>{days}</strong>
            </div>

            <div>
              <label style={labelStyle}>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Enter reason for leave…" required />
            </div>

            {error && <div style={{ padding: "8px 12px", background: "var(--red-bg)", borderRadius: "var(--radius-xs)", fontSize: 12, color: "var(--red)" }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--radius-xs)", background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} style={{ padding: "8px 16px", borderRadius: "var(--radius-xs)", background: "var(--blue)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Submitting…" : "Apply Leave"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
