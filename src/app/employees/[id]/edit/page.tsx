"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { updateEmployee } from "@/app/actions/employee";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entity { id: string; code: string; name: string; }
interface Location { id: string; code: string; name: string; entityId: string; }
interface Department { id: string; name: string; }
interface SubDepartment { id: string; name: string; departmentId: string; }
interface Designation { id: string; name: string; }
interface ShiftCode { id: string; code: string; name: string; }

interface FormOptions {
  entities: Entity[];
  locations: Location[];
  departments: Department[];
  subDepartments: SubDepartment[];
  designations: Designation[];
  shiftCodes: ShiftCode[];
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-1)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 6,
};

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  color: "var(--text-3)",
  cursor: "default",
};

function FormField({ label, required, children, fullWidth }: {
  label: string; required?: boolean; children: React.ReactNode; fullWidth?: boolean;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { readOnly?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...(props.readOnly ? readonlyInputStyle : inputStyle),
        ...(focused && !props.readOnly ? { borderColor: "var(--blue)", boxShadow: "0 0 0 3px rgba(10,132,255,0.12)" } : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 36,
        ...(focused ? { borderColor: "var(--blue)", boxShadow: "0 0 0 3px rgba(10,132,255,0.12)" } : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

const TABS = ["Personal", "Employment", "Bank", "Salary", "Statutory"] as const;
type Tab = typeof TABS[number];

interface EmployeeData {
  employeeCode: string;
  fullName: string;
  careOfName: string | null;
  careOfRelation: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  contact1: string | null;
  contact2: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  entityId: string;
  locationId: string;
  departmentId: string;
  subDepartmentId: string | null;
  designationId: string;
  shiftCodeId: string | null;
  dateOfJoining: string;
  dateOfJoiningCurrent: string | null;
  status: string;
  bonusMonth: number | null;
  appraisalDate: string | null;
  bankAccountNo: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  salary: number;
  travelAllow: number;
  uanNumber: string | null;
  uanStatus: string;
  esiNumber: string | null;
  esiStatus: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>("Personal");
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: "", careOfName: "", careOfRelation: "", dateOfBirth: "",
    gender: "", bloodGroup: "", aadhaarNumber: "", panNumber: "",
    contact1: "", contact2: "", presentAddress: "", permanentAddress: "",
    entityId: "", locationId: "", departmentId: "", subDepartmentId: "",
    designationId: "", shiftCodeId: "", dateOfJoining: "", dateOfJoiningCurrent: "",
    status: "ACTIVE", bonusMonth: "", appraisalDate: "",
    bankAccountNo: "", bankName: "", bankIfsc: "", bankBranch: "",
    salary: "", travelAllow: "0",
    uanNumber: "", uanStatus: "NOT_GENERATED", esiNumber: "", esiStatus: "NOT_GENERATED",
    employeeCode: "",
  });

  const salaryNum = parseFloat(form.salary) || 0;
  const basic = Math.round(salaryNum * 0.7);
  const hra = Math.round(salaryNum * 0.2);
  const specialAllow = salaryNum - basic - hra;

  // Load employee data + options
  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${id}`).then((r) => r.json()),
      fetch("/api/form-options").then((r) => r.json()),
    ])
      .then(([empData, optsData]: [EmployeeData, FormOptions]) => {
        setOptions(optsData);
        setForm({
          fullName: empData.fullName ?? "",
          careOfName: empData.careOfName ?? "",
          careOfRelation: empData.careOfRelation ?? "",
          dateOfBirth: empData.dateOfBirth ? empData.dateOfBirth.split("T")[0] : "",
          gender: empData.gender ?? "",
          bloodGroup: empData.bloodGroup ?? "",
          aadhaarNumber: empData.aadhaarNumber ?? "",
          panNumber: empData.panNumber ?? "",
          contact1: empData.contact1 ?? "",
          contact2: empData.contact2 ?? "",
          presentAddress: empData.presentAddress ?? "",
          permanentAddress: empData.permanentAddress ?? "",
          entityId: empData.entityId ?? "",
          locationId: empData.locationId ?? "",
          departmentId: empData.departmentId ?? "",
          subDepartmentId: empData.subDepartmentId ?? "",
          designationId: empData.designationId ?? "",
          shiftCodeId: empData.shiftCodeId ?? "",
          dateOfJoining: empData.dateOfJoining ? empData.dateOfJoining.split("T")[0] : "",
          dateOfJoiningCurrent: empData.dateOfJoiningCurrent ? empData.dateOfJoiningCurrent.split("T")[0] : "",
          status: empData.status ?? "ACTIVE",
          bonusMonth: empData.bonusMonth ? String(empData.bonusMonth) : "",
          appraisalDate: empData.appraisalDate ? empData.appraisalDate.split("T")[0] : "",
          bankAccountNo: empData.bankAccountNo ?? "",
          bankName: empData.bankName ?? "",
          bankIfsc: empData.bankIfsc ?? "",
          bankBranch: empData.bankBranch ?? "",
          salary: String(empData.salary ?? ""),
          travelAllow: String(empData.travelAllow ?? "0"),
          uanNumber: empData.uanNumber ?? "",
          uanStatus: empData.uanStatus ?? "NOT_GENERATED",
          esiNumber: empData.esiNumber ?? "",
          esiStatus: empData.esiStatus ?? "NOT_GENERATED",
          employeeCode: empData.employeeCode ?? "",
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load employee data.");
        setLoading(false);
      });
  }, [id]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const filteredLocations = options?.locations.filter(
    (l) => !form.entityId || l.entityId === form.entityId
  ) ?? [];
  const filteredSubDepts = options?.subDepartments.filter(
    (s) => !form.departmentId || s.departmentId === form.departmentId
  ) ?? [];

  async function handleSubmit() {
    setError(null);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append("basic", String(basic));
    formData.append("hra", String(hra));
    formData.append("specialAllow", String(specialAllow));

    startTransition(async () => {
      const result = await updateEmployee(id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(`/employees/${id}`);
      }
    });
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        Loading employee data…
      </div>
    );
  }

  function renderPersonal() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <FormField label="Employee Code">
          <StyledInput value={form.employeeCode} readOnly />
        </FormField>
        <FormField label="Full Name" required>
          <StyledInput value={form.fullName} onChange={set("fullName")} />
        </FormField>
        <FormField label="Care-of Name">
          <StyledInput value={form.careOfName} onChange={set("careOfName")} />
        </FormField>
        <FormField label="Relation">
          <StyledSelect value={form.careOfRelation} onChange={set("careOfRelation")}>
            <option value="">— Select —</option>
            <option value="Father">Father</option>
            <option value="Husband">Husband</option>
          </StyledSelect>
        </FormField>
        <FormField label="Date of Birth">
          <StyledInput type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
        </FormField>
        <FormField label="Gender">
          <StyledSelect value={form.gender} onChange={set("gender")}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </StyledSelect>
        </FormField>
        <FormField label="Blood Group">
          <StyledSelect value={form.bloodGroup} onChange={set("bloodGroup")}>
            <option value="">— Select —</option>
            {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </StyledSelect>
        </FormField>
        <FormField label="Aadhaar Number">
          <StyledInput value={form.aadhaarNumber} onChange={set("aadhaarNumber")} maxLength={14} />
        </FormField>
        <FormField label="PAN Number">
          <StyledInput value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))} maxLength={10} />
        </FormField>
        <FormField label="Contact 1" required>
          <StyledInput value={form.contact1} onChange={set("contact1")} />
        </FormField>
        <FormField label="Contact 2">
          <StyledInput value={form.contact2} onChange={set("contact2")} />
        </FormField>
        <FormField label="Present Address" fullWidth>
          <StyledInput value={form.presentAddress} onChange={set("presentAddress")} />
        </FormField>
        <FormField label="Permanent Address" fullWidth>
          <StyledInput value={form.permanentAddress} onChange={set("permanentAddress")} />
        </FormField>
      </div>
    );
  }

  function renderEmployment() {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <FormField label="Entity" required>
          <StyledSelect value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value, locationId: "" }))}>
            <option value="">— Select Entity —</option>
            {options?.entities.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Location" required>
          <StyledSelect value={form.locationId} onChange={set("locationId")} disabled={!form.entityId}>
            <option value="">— Select Location —</option>
            {filteredLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Department" required>
          <StyledSelect value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, subDepartmentId: "" }))}>
            <option value="">— Select Department —</option>
            {options?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Sub-Department">
          <StyledSelect value={form.subDepartmentId} onChange={set("subDepartmentId")} disabled={!form.departmentId}>
            <option value="">— Select Sub-Department —</option>
            {filteredSubDepts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Designation" required>
          <StyledSelect value={form.designationId} onChange={set("designationId")}>
            <option value="">— Select Designation —</option>
            {options?.designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Shift Code">
          <StyledSelect value={form.shiftCodeId} onChange={set("shiftCodeId")}>
            <option value="">— Select Shift —</option>
            {options?.shiftCodes.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Date of Joining" required>
          <StyledInput type="date" value={form.dateOfJoining} onChange={set("dateOfJoining")} />
        </FormField>
        <FormField label="Date of Joining (Current Role)">
          <StyledInput type="date" value={form.dateOfJoiningCurrent} onChange={set("dateOfJoiningCurrent")} />
        </FormField>
        <FormField label="Employment Status">
          <StyledSelect value={form.status} onChange={set("status")}>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="NOTICE">Notice</option>
            <option value="SEPARATED">Separated</option>
          </StyledSelect>
        </FormField>
        <FormField label="Bonus Month">
          <StyledSelect value={form.bonusMonth} onChange={set("bonusMonth")}>
            <option value="">— None —</option>
            {months.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="Appraisal Date">
          <StyledInput type="date" value={form.appraisalDate} onChange={set("appraisalDate")} />
        </FormField>
      </div>
    );
  }

  function renderBank() {
    const banks = ["ICICI Bank","SBI","Kotak Mahindra Bank","HDFC Bank","Bank of Baroda","Indian Bank","UCO Bank","IndusInd Bank","IOB","Canara Bank","Union Bank","Karur Vysya Bank"];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <FormField label="Account Number">
          <StyledInput value={form.bankAccountNo} onChange={set("bankAccountNo")} />
        </FormField>
        <FormField label="Bank Name">
          <StyledSelect value={form.bankName} onChange={set("bankName")}>
            <option value="">— Select Bank —</option>
            {banks.map((b) => <option key={b} value={b}>{b}</option>)}
          </StyledSelect>
        </FormField>
        <FormField label="IFSC Code">
          <StyledInput value={form.bankIfsc} onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))} maxLength={11} />
        </FormField>
        <FormField label="Branch Name">
          <StyledInput value={form.bankBranch} onChange={set("bankBranch")} />
        </FormField>
      </div>
    );
  }

  function renderSalary() {
    const fmt = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "₹0";
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <FormField label="Monthly Salary (CTC)" required>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", fontSize: 13 }}>₹</span>
            <StyledInput type="number" value={form.salary} onChange={set("salary")} style={{ paddingLeft: 28 }} />
          </div>
        </FormField>
        <FormField label="Travel Allowance (Fixed)">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", fontSize: 13 }}>₹</span>
            <StyledInput type="number" value={form.travelAllow} onChange={set("travelAllow")} style={{ paddingLeft: 28 }} />
          </div>
        </FormField>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "16px 20px", marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Auto-calculated Breakdown</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[{ label: "Basic + DA (70%)", value: fmt(basic) }, { label: "HRA (20%)", value: fmt(hra) }, { label: "Special Allowance (10%)", value: fmt(specialAllow) }].map((row) => (
                <div key={row.label}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--amber)", fontVariantNumeric: "tabular-nums" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStatutory() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <FormField label="UAN Number">
          <StyledInput value={form.uanNumber} onChange={set("uanNumber")} />
        </FormField>
        <FormField label="UAN Status">
          <StyledSelect value={form.uanStatus} onChange={set("uanStatus")}>
            <option value="NOT_GENERATED">Not Generated</option>
            <option value="GENERATED">Generated</option>
          </StyledSelect>
        </FormField>
        <FormField label="ESI Number">
          <StyledInput value={form.esiNumber} onChange={set("esiNumber")} />
        </FormField>
        <FormField label="ESI Status">
          <StyledSelect value={form.esiStatus} onChange={set("esiStatus")}>
            <option value="NOT_GENERATED">Not Generated</option>
            <option value="GENERATED">Generated</option>
            <option value="EXEMPTED">Exempted</option>
          </StyledSelect>
        </FormField>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Edit Employee</h1>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => router.push(`/employees/${id}`)}
          style={{ padding: "8px 16px", borderRadius: "var(--radius-xs)", background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          style={{ padding: "8px 20px", borderRadius: "var(--radius-xs)", background: isPending ? "var(--blue-bg)" : "var(--blue)", color: isPending ? "var(--blue)" : "#fff", fontSize: 13, fontWeight: 600, cursor: isPending ? "default" : "pointer", border: "none" }}
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Segmented tabs */}
      <div style={{ display: "inline-flex", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: 20, gap: 2 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "var(--transition)", background: activeTab === tab ? "var(--blue)" : "transparent", color: activeTab === tab ? "#fff" : "var(--text-3)" }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        {activeTab === "Personal" && renderPersonal()}
        {activeTab === "Employment" && renderEmployment()}
        {activeTab === "Bank" && renderBank()}
        {activeTab === "Salary" && renderSalary()}
        {activeTab === "Statutory" && renderStatutory()}
      </div>
    </div>
  );
}
