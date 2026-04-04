"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
}

interface Props {
  entityId: string;
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onSaved: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "var(--radius-xs)",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-1)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  display: "block",
  marginBottom: 6,
};

export function LoanModal({ entityId, defaultMonth, defaultYear, onClose, onSaved }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loanType, setLoanType] = useState("EMPLOYEE_LOAN");
  const [principal, setPrincipal] = useState("");
  const [emi, setEmi] = useState("");
  const [tenure, setTenure] = useState("12");
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [startYear, setStartYear] = useState(defaultYear);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    fetch(`/api/employees?entityId=${entityId}&limit=200`)
      .then((r) => r.json())
      .then((data: { employees?: Employee[] } | Employee[]) => {
        const list = Array.isArray(data) ? data : (data.employees ?? []);
        setEmployees(list);
        if (list.length > 0) setEmployeeId(list[0].id);
      })
      .catch(() => {});
  }, [entityId]);

  function handleTenureChange(val: string) {
    setTenure(val);
    const t = parseInt(val);
    const p = parseFloat(principal);
    if (t > 0 && p > 0) {
      setEmi(String(Math.round(p / t)));
    }
  }

  function handlePrincipalChange(val: string) {
    setPrincipal(val);
    const t = parseInt(tenure);
    const p = parseFloat(val);
    if (t > 0 && p > 0) {
      setEmi(String(Math.round(p / t)));
    }
  }

  function checkWarning() {
    const p = parseFloat(principal);
    const e = parseFloat(emi);
    const t = parseInt(tenure);
    if (p > 0 && e > 0 && t > 0) {
      const totalEmi = e * t;
      const diff = Math.abs(totalEmi - p) / p;
      if (diff > 0.1) {
        setWarning(`EMI × tenure = ${(e * t).toLocaleString("en-IN")} differs from principal by ${Math.round(diff * 100)}%. This may indicate interest.`);
      } else {
        setWarning("");
      }
    } else {
      setWarning("");
    }
  }

  useEffect(() => { checkWarning(); }, [principal, emi, tenure]); // eslint-disable-line

  async function handleSave() {
    if (!employeeId) { setError("Select an employee."); return; }
    const p = parseFloat(principal);
    const e = parseFloat(emi);
    const t = parseInt(tenure);
    if (!p || p <= 0) { setError("Principal must be > 0."); return; }
    if (!e || e <= 0) { setError("EMI must be > 0."); return; }
    if (!t || t < 1) { setError("Tenure must be at least 1 month."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId, loanType,
          principalAmount: p, emiAmount: e, tenure: t,
          startMonth, startYear,
          remarks: remarks || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setError(err.error ?? "Save failed");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Issue Loan</span>
          <button onClick={onClose} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", padding: "5px 7px", color: "var(--text-3)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ fontSize: 12, color: "var(--red)", background: "var(--red-bg)", padding: "8px 12px", borderRadius: "var(--radius-xs)" }}>{error}</div>}
          {warning && <div style={{ fontSize: 12, color: "var(--amber)", background: "var(--amber-bg)", padding: "8px 12px", borderRadius: "var(--radius-xs)" }}>{warning}</div>}

          <div>
            <label style={labelStyle}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.fullName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Loan Type</label>
            <select value={loanType} onChange={(e) => setLoanType(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              <option value="EMPLOYEE_LOAN">Employee Loan</option>
              <option value="CASH_LOAN">Cash Loan</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Principal Amount (₹)</label>
              <input
                type="number" min="0" step="1000"
                value={principal}
                onChange={(e) => handlePrincipalChange(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tenure (months)</label>
              <input
                type="number" min="1" step="1"
                value={tenure}
                onChange={(e) => handleTenureChange(e.target.value)}
                placeholder="12"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Monthly EMI (₹)</label>
            <input
              type="number" min="0" step="100"
              value={emi}
              onChange={(e) => setEmi(e.target.value)}
              placeholder="Auto-calculated"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Month</label>
              <select value={startMonth} onChange={(e) => setStartMonth(parseInt(e.target.value))} style={{ ...inputStyle, appearance: "none" }}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Start Year</label>
              <select value={startYear} onChange={(e) => setStartYear(parseInt(e.target.value))} style={{ ...inputStyle, appearance: "none" }}>
                {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Reason for loan..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: "var(--radius-xs)", background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "7px 14px", borderRadius: "var(--radius-xs)", background: "var(--blue)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Issuing\u2026" : "Issue Loan"}
          </button>
        </div>
      </div>
    </div>
  );
}
