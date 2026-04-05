"use client";

import { useState, useEffect } from "react";

interface Employee { id: string; employeeCode: string; fullName: string; }

interface Declaration {
  id?: string;
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
}

interface Props {
  entityId: string;
  fy: string;
  employees: Employee[];
  initial?: Declaration | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: Omit<Declaration, "employeeId" | "financialYear"> = {
  regime: "NEW",
  sec80C_ppf: 0, sec80C_elss: 0, sec80C_lic: 0, sec80C_nsc: 0,
  sec80C_tuition: 0, sec80C_homeLoan: 0, sec80C_fd: 0, sec80C_sukanya: 0, sec80C_other: 0,
  sec80D_self: 0, sec80D_parents: 0,
  sec24_homeLoanInterest: 0,
  sec80E_eduLoan: 0, sec80G_donation: 0, nps_80CCD: 0,
  hraRentPaid: 0, hraMetro: false,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: "var(--radius-xs)",
  background: "var(--bg-2)", border: "1px solid var(--glass-border)",
  color: "var(--text-1)", fontSize: 13, boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--text-3)", display: "block", marginBottom: 4,
};
const sectionHeadStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "var(--text-2)", margin: "16px 0 10px",
  paddingBottom: 6, borderBottom: "1px solid var(--glass-border)",
};

function NumInput({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  function handleBlur() {
    const n = parseFloat(raw.replace(/,/g, "")) || 0;
    const capped = max !== undefined ? Math.min(n, max) : n;
    onChange(capped);
    setRaw(capped === 0 ? "" : capped.toLocaleString("en-IN"));
  }

  return (
    <div>
      <label style={labelStyle}>{label}{max !== undefined ? ` (max ₹${max.toLocaleString("en-IN")})` : ""}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-3)" }}>₹</span>
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={() => setRaw(value === 0 ? "" : String(value))}
          onBlur={handleBlur}
          style={{ ...inputStyle, paddingLeft: 22 }}
          placeholder="0"
        />
      </div>
    </div>
  );
}

export default function DeclarationModal({ entityId, fy, employees, initial, onClose, onSaved }: Props) {
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? "");
  const [form, setForm] = useState<Omit<Declaration, "employeeId" | "financialYear">>({
    ...EMPTY,
    ...(initial ? {
      regime: initial.regime,
      sec80C_ppf: initial.sec80C_ppf, sec80C_elss: initial.sec80C_elss, sec80C_lic: initial.sec80C_lic,
      sec80C_nsc: initial.sec80C_nsc, sec80C_tuition: initial.sec80C_tuition, sec80C_homeLoan: initial.sec80C_homeLoan,
      sec80C_fd: initial.sec80C_fd, sec80C_sukanya: initial.sec80C_sukanya, sec80C_other: initial.sec80C_other,
      sec80D_self: initial.sec80D_self, sec80D_parents: initial.sec80D_parents,
      sec24_homeLoanInterest: initial.sec24_homeLoanInterest,
      sec80E_eduLoan: initial.sec80E_eduLoan, sec80G_donation: initial.sec80G_donation, nps_80CCD: initial.nps_80CCD,
      hraRentPaid: initial.hraRentPaid, hraMetro: initial.hraMetro,
    } : {}),
  });
  const [loading, setLoading] = useState(false);

  // Live computed totals
  const raw80C = form.sec80C_ppf + form.sec80C_elss + form.sec80C_lic + form.sec80C_nsc +
    form.sec80C_tuition + form.sec80C_homeLoan + form.sec80C_fd + form.sec80C_sukanya + form.sec80C_other;
  const total80C = Math.min(raw80C, 150000);
  const totalDeductions = total80C + form.sec80D_self + form.sec80D_parents +
    form.sec24_homeLoanInterest + form.sec80E_eduLoan + form.sec80G_donation + form.nps_80CCD;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) { alert("Select an employee"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/declarations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, entityId, financialYear: fy, ...form }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; alert(d.error ?? "Failed"); return; }
      onSaved();
      onClose();
    } catch { alert("Network error"); } finally { setLoading(false); }
  }

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-IN");
  const isOld = form.regime === "OLD";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", width: "100%", maxWidth: 580, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", padding: 24, marginTop: 20 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
              {initial ? "Edit Declaration" : "Add Declaration"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>FY {fy}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          {/* Employee + Regime */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!!initial}
                style={{ ...inputStyle, appearance: "none" }}
                required
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.employeeCode} — {emp.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tax Regime</label>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                {(["NEW", "OLD"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("regime", r)}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      background: form.regime === r ? (r === "NEW" ? "var(--blue)" : "var(--amber-bg)") : "var(--glass)",
                      color: form.regime === r ? (r === "NEW" ? "#fff" : "var(--amber)") : "var(--text-3)",
                    }}
                  >{r} Regime</button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 80C */}
          <div style={sectionHeadStyle}>Section 80C — Max ₹1,50,000</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <NumInput label="PPF" value={form.sec80C_ppf} onChange={(v) => set("sec80C_ppf", v)} />
            <NumInput label="ELSS Mutual Funds" value={form.sec80C_elss} onChange={(v) => set("sec80C_elss", v)} />
            <NumInput label="LIC Premium" value={form.sec80C_lic} onChange={(v) => set("sec80C_lic", v)} />
            <NumInput label="NSC" value={form.sec80C_nsc} onChange={(v) => set("sec80C_nsc", v)} />
            <NumInput label="Children Tuition Fee" value={form.sec80C_tuition} onChange={(v) => set("sec80C_tuition", v)} />
            <NumInput label="Home Loan Principal" value={form.sec80C_homeLoan} onChange={(v) => set("sec80C_homeLoan", v)} />
            <NumInput label="5-Yr Tax Saver FD" value={form.sec80C_fd} onChange={(v) => set("sec80C_fd", v)} />
            <NumInput label="Sukanya Samriddhi" value={form.sec80C_sukanya} onChange={(v) => set("sec80C_sukanya", v)} />
            <NumInput label="Other 80C" value={form.sec80C_other} onChange={(v) => set("sec80C_other", v)} />
          </div>
          {/* 80C running total */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderRadius: "var(--radius-xs)",
            background: raw80C > 150000 ? "var(--red-bg)" : "var(--green-bg)",
            border: `1px solid ${raw80C > 150000 ? "var(--red)" : "var(--green)"}`,
          }}>
            <span style={{ fontSize: 11, color: raw80C > 150000 ? "var(--red)" : "var(--green)", fontWeight: 600 }}>
              80C Total (entered): ₹{fmt(raw80C)}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Eligible: ₹{fmt(total80C)} / ₹1,50,000
            </span>
          </div>

          {/* Section 80D */}
          <div style={sectionHeadStyle}>Section 80D — Health Insurance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <NumInput label="Self & Family" value={form.sec80D_self} onChange={(v) => set("sec80D_self", v)} max={25000} />
            <NumInput label="Parents" value={form.sec80D_parents} onChange={(v) => set("sec80D_parents", v)} max={25000} />
          </div>

          {/* Section 24(b) */}
          <div style={sectionHeadStyle}>Section 24(b) — Home Loan Interest</div>
          <NumInput label="Annual Home Loan Interest" value={form.sec24_homeLoanInterest} onChange={(v) => set("sec24_homeLoanInterest", v)} max={200000} />

          {/* Other sections */}
          <div style={sectionHeadStyle}>Other Deductions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <NumInput label="Edu Loan Interest (80E)" value={form.sec80E_eduLoan} onChange={(v) => set("sec80E_eduLoan", v)} />
            <NumInput label="Donations (80G)" value={form.sec80G_donation} onChange={(v) => set("sec80G_donation", v)} />
            <NumInput label="NPS — 80CCD(1B)" value={form.nps_80CCD} onChange={(v) => set("nps_80CCD", v)} max={50000} />
          </div>

          {/* HRA — old regime only */}
          {isOld && (
            <>
              <div style={sectionHeadStyle}>HRA Exemption</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
                <NumInput label="Monthly Rent Paid" value={form.hraRentPaid} onChange={(v) => set("hraRentPaid", v)} />
                <div>
                  <label style={labelStyle}>Metro City?</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.hraMetro}
                      onChange={(e) => set("hraMetro", e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: "var(--blue)" }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {form.hraMetro ? "Metro (50% of Basic)" : "Non-Metro (40% of Basic)"}
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Grand total */}
          <div style={{
            padding: "12px 16px", borderRadius: "var(--radius-xs)",
            background: "var(--glass)", border: "1px solid var(--glass-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Total Deductions</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--blue)" }}>₹{fmt(totalDeductions)}</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 16px", borderRadius: "var(--radius-xs)",
              background: "var(--glass)", border: "1px solid var(--glass-border)",
              color: "var(--text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: "8px 20px", borderRadius: "var(--radius-xs)",
              background: "var(--blue)", border: "none",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>{loading ? "Saving…" : "Save Declaration"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
