import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const emp = await db.employee.findUnique({
    where: { id },
    include: {
      entity: true,
      location: true,
      department: true,
      subDepartment: true,
      designation: true,
      shiftCode: true,
    },
  });

  if (!emp) notFound();

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{emp.fullName}</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>{emp.employeeCode}</p>
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/employees"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-xs)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Back to List
        </Link>
        <Link
          href={`/employees/${id}/edit`}
          style={{
            padding: "8px 20px",
            borderRadius: "var(--radius-xs)",
            background: "var(--blue)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Edit
        </Link>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Personal Info */}
          <InfoCard title="Personal Information">
            <InfoRow label="Full Name" value={emp.fullName} />
            {emp.careOfName && (
              <InfoRow label={`${emp.careOfRelation ?? "Care-of"}`} value={emp.careOfName} />
            )}
            <InfoRow label="Date of Birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : "—"} />
            <InfoRow label="Gender" value={emp.gender ?? "—"} />
            <InfoRow label="Blood Group" value={emp.bloodGroup ?? "—"} />
            <InfoRow label="Aadhaar" value={emp.aadhaarNumber ?? "—"} />
            <InfoRow label="PAN" value={emp.panNumber ?? "—"} />
            <InfoRow label="Contact 1" value={emp.contact1 ?? "—"} />
            <InfoRow label="Contact 2" value={emp.contact2 ?? "—"} />
            <InfoRow label="Present Address" value={emp.presentAddress ?? "—"} fullWidth />
            <InfoRow label="Permanent Address" value={emp.permanentAddress ?? "—"} fullWidth />
          </InfoCard>

          {/* Employment Info */}
          <InfoCard title="Employment Details">
            <InfoRow label="Entity" value={`${emp.entity.code} — ${emp.entity.name}`} />
            <InfoRow label="Location" value={emp.location.name} />
            <InfoRow label="Department" value={emp.department.name} />
            <InfoRow label="Sub-Department" value={emp.subDepartment?.name ?? "—"} />
            <InfoRow label="Designation" value={emp.designation.name} />
            <InfoRow label="Shift" value={emp.shiftCode ? `${emp.shiftCode.code} — ${emp.shiftCode.name}` : "—"} />
            <InfoRow label="Date of Joining" value={formatDate(emp.dateOfJoining)} />
            {emp.dateOfJoiningCurrent && (
              <InfoRow label="DOJ (Current Role)" value={formatDate(emp.dateOfJoiningCurrent)} />
            )}
            <InfoRow
              label="Status"
              value={
                <StatusBadge status={emp.status as "ACTIVE" | "PROBATION" | "NOTICE" | "SEPARATED"} />
              }
            />
            {emp.bonusMonth && (
              <InfoRow label="Bonus Month" value={new Date(2000, emp.bonusMonth - 1).toLocaleString("en-IN", { month: "long" })} />
            )}
            {emp.appraisalDate && (
              <InfoRow label="Appraisal Date" value={formatDate(emp.appraisalDate)} />
            )}
          </InfoCard>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Bank Details */}
          <InfoCard title="Bank Details">
            <InfoRow label="Account Number" value={emp.bankAccountNo ?? "—"} />
            <InfoRow label="Bank Name" value={emp.bankName ?? "—"} />
            <InfoRow label="IFSC Code" value={emp.bankIfsc ?? "—"} />
            <InfoRow label="Branch" value={emp.bankBranch ?? "—"} />
          </InfoCard>

          {/* Salary */}
          <InfoCard title="Salary Structure">
            <InfoRow label="Monthly CTC" value={formatINR(Number(emp.salary))} accent="amber" />
            <InfoRow label="Basic + DA" value={formatINR(Number(emp.basic))} />
            <InfoRow label="HRA" value={formatINR(Number(emp.hra))} />
            <InfoRow label="Special Allowance" value={formatINR(Number(emp.specialAllow))} />
            <InfoRow label="Travel Allowance" value={formatINR(Number(emp.travelAllow))} />
          </InfoCard>

          {/* Statutory */}
          <InfoCard title="Statutory">
            <InfoRow label="UAN Number" value={emp.uanNumber ?? "—"} />
            <InfoRow
              label="UAN Status"
              value={
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                  background: emp.uanStatus === "GENERATED" ? "var(--green-bg)" : "var(--glass)",
                  color: emp.uanStatus === "GENERATED" ? "var(--green)" : "var(--text-3)",
                }}>
                  {emp.uanStatus}
                </span>
              }
            />
            <InfoRow label="ESI Number" value={emp.esiNumber ?? "—"} />
            <InfoRow
              label="ESI Status"
              value={
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                  background: emp.esiStatus === "GENERATED" ? "var(--green-bg)" : emp.esiStatus === "EXEMPTED" ? "var(--amber-bg)" : "var(--glass)",
                  color: emp.esiStatus === "GENERATED" ? "var(--green)" : emp.esiStatus === "EXEMPTED" ? "var(--amber)" : "var(--text-3)",
                }}>
                  {emp.esiStatus}
                </span>
              }
            />
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid var(--glass-border)",
        background: "var(--bg-2)",
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{title}</h3>
      </div>
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  fullWidth,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
  accent?: string;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3, fontWeight: 500 }}>{label}</div>
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: accent ? `var(--${accent})` : "var(--text-1)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  );
}
