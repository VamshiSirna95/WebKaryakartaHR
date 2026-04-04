"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const ADVANCE_TYPES = [
  { value: "BANK_ADVANCE", label: "Bank Advance" },
  { value: "CASH_ADVANCE", label: "Cash Advance" },
  { value: "JIFY_ADVANCE", label: "Jify Advance" },
  { value: "LOAN_EMI", label: "Loan EMI" },
  { value: "CASH_LOAN_EMI", label: "Cash Loan EMI" },
];

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
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

interface Props {
  month: number;
  year: number;
  entityId: string;
  editEntry?: AdvanceEntry | null;
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

export function AdvanceModal({ month, year, entityId, editEntry, onClose, onSaved }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(editEntry?.employeeId ?? "");
  const [type, setType] = useState(editEntry?.type ?? "BANK_ADVANCE");
  const [amount, setAmount] = useState(editEntry?.amount ? String(editEntry.amount) : "");
  const [date, setDate] = useState(editEntry?.date ? editEntry.date.slice(0, 10) : "");
  const [remarks, setRemarks] = useState(editEntry?.remarks ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/employees?entityId=${entityId}&limit=200`)
      .then((r) => r.json())
      .then((data: { employees?: Employee[] } | Employee[]) => {
        const list = Array.isArray(data) ? data : (data.employees ?? []);
        setEmployees(list);
        if (!editEntry && list.length > 0) setEmployeeId(list[0].id);
      })
      .catch(() => {
        fetch(`/api/employees`)
          .then((r) => r.json())
          .then((data: { employees?: Employee[] } | Employee[]) => {
            const list = Array.isArray(data) ? data : (data.employees ?? []);
            setEmployees(list);
            if (!editEntry && list.length > 0) setEmployeeId(list[0].id);
          })
          .catch(() => {});
      });
  }, [entityId, editEntry]);

  async function handleSave() {
    if (!employeeId || !amount || !type) {
      setError("Employee, type, and amount are required.");
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const url = editEntry ? `/api/advances/${editEntry.id}` : "/api/advances";
      const method = editEntry ? "PUT" : "POST";
      const body = editEntry
        ? { type, amount: amtNum, date: date || null, remarks: remarks || null }
        : { employeeId, type, amount: amtNum, month, year, date: date || null, remarks: remarks || null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function handleDelete() {
    if (!editEntry) return;
    if (!confirm("Delete this advance entry?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/advances/${editEntry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setError(err.error ?? "Delete failed");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
            {editEntry ? "Edit Advance" : "Add Advance"}
          </span>
          <button onClick={onClose} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", padding: "5px 7px", color: "var(--text-3)", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ fontSize: 12, color: "var(--red)", background: "var(--red-bg)", padding: "8px 12px", borderRadius: "var(--radius-xs)" }}>
              {error}
            </div>
          )}

          {!editEntry && (
            <div>
              <label style={labelStyle}>Employee</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employeeCode} — {e.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              {ADVANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Amount (₹)</label>
            <input
              type="number" min="0" step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Date (optional)</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Enter remarks..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {editEntry && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: "7px 14px", borderRadius: "var(--radius-xs)", background: "var(--red-bg)", border: "1px solid var(--glass-border)", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", marginRight: "auto" }}
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </button>
          )}
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: "var(--radius-xs)", background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "7px 14px", borderRadius: "var(--radius-xs)", background: "var(--blue)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving\u2026" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
