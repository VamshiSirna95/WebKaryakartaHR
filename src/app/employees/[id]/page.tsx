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

  const currentFY = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const [emp, leaveBalances, leaveRequests] = await Promise.all([
    db.employee.findUnique({
      where: { id },
      include: {
        entity: true,
        location: true,
        department: true,
        subDepartment: true,
        designation: true,
        shiftCode: true,
      },
    }),
    db.leaveBalance.findMany({
      where: { employeeId: id, year: currentFY },
      include: { leaveType: { select: { code: true, name: true, annualQuota: true } } },
      orderBy: { leaveType: { code: "asc" } },
    }),
    db.leaveRequest.findMany({
      where: { employeeId: id },
      include: { leaveType: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

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

      {/* Leave Summary */}
      {leaveBalances.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
              Leave Summary (FY {currentFY}-{String(currentFY + 1).slice(2)})
            </h3>
            <Link href="/leaves" style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>
              View all in Leaves module →
            </Link>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {/* Balance cards */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {leaveBalances.map((b) => {
                const pct = b.credited > 0 ? b.balance / b.credited : 1;
                const color = pct > 0.5 ? "var(--green)" : pct > 0.25 ? "var(--amber)" : "var(--red)";
                return (
                  <div key={b.id} style={{ padding: "8px 14px", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", marginBottom: 4 }}>{b.leaveType.code}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>
                      {b.balance}<span style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 400 }}>/{b.credited}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-4)" }}>{b.used} used</div>
                  </div>
                );
              })}
            </div>
            {/* Recent requests */}
            {leaveRequests.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Type", "From", "To", "Days", "Status", "Reason"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((r) => {
                      const statusColors: Record<string, { bg: string; color: string }> = {
                        PENDING: { bg: "var(--amber-bg)", color: "var(--amber)" },
                        APPROVED: { bg: "var(--green-bg)", color: "var(--green)" },
                        REJECTED: { bg: "var(--red-bg)", color: "var(--red)" },
                        CANCELLED: { bg: "var(--glass)", color: "var(--text-3)" },
                      };
                      const sc = statusColors[r.status] ?? statusColors.CANCELLED;
                      return (
                        <tr key={r.id}>
                          <td style={{ padding: "7px 10px", fontSize: 11, color: "var(--text-2)", borderBottom: "1px solid var(--glass-border)" }}>
                            <span style={{ fontWeight: 700, color: "var(--blue)" }}>{r.leaveType.code}</span>
                          </td>
                          <td style={{ padding: "7px 10px", fontSize: 11, color: "var(--text-2)", borderBottom: "1px solid var(--glass-border)" }}>{formatDate(r.fromDate)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, color: "var(--text-2)", borderBottom: "1px solid var(--glass-border)" }}>{formatDate(r.toDate)}</td>
                          <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-1)", borderBottom: "1px solid var(--glass-border)", textAlign: "center" }}>{r.days}</td>
                          <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--glass-border)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, ...sc }}>{r.status}</span>
                          </td>
                          <td style={{ padding: "7px 10px", fontSize: 11, color: "var(--text-3)", borderBottom: "1px solid var(--glass-border)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
