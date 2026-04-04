"use client";

import Link from "next/link";
import { formatINR, getInitials, getAvatarGradient } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface EmployeeRow {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  designationName: string;
  locationName: string;
  salary: number;
  status: "ACTIVE" | "PROBATION" | "NOTICE" | "SEPARATED";
}

interface EmployeeTableProps {
  employees: EmployeeRow[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-2)" }}>
              {["Employee", "Department", "Designation", "Location", "Salary", "Status", "Actions"].map(
                (header) => (
                  <th
                    key={header}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--text-3)",
                      borderBottom: "1px solid var(--glass-border)",
                      whiteSpace: "nowrap",
                      position: "sticky",
                      top: 0,
                      background: "var(--bg-2)",
                      zIndex: 1,
                    }}
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const initials = getInitials(emp.fullName);
              const [gradStart, gradEnd] = getAvatarGradient(initials);
              return (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    transition: "var(--transition)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--glass-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-xs)",
                          background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                          {emp.fullName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {emp.employeeCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>{emp.departmentName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>{emp.designationName}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>{emp.locationName}</td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--amber)",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatINR(emp.salary)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={emp.status} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link
                      href={`/employees/${emp.id}/edit`}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "var(--radius-xs)",
                        background: "var(--glass)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-2)",
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: "none",
                        transition: "var(--transition)",
                      }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)" }}>
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
