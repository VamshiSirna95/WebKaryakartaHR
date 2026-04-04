"use client";

import { useState } from "react";
import { AttendanceDayCell } from "./AttendanceDayCell";

interface EmployeeRow {
  recordId: string;
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  location: string;
  days: Record<string, string | null>;
  workedDays: number | null;
  weekOffs: number | null;
  otDays: number | null;
  payableDays: number | null;
}

interface AttendanceGridProps {
  employees: EmployeeRow[];
  daysInMonth: number;
  sundays: number[];
  holidays: { day: number; name: string }[];
  locked: boolean;
}

export function AttendanceGrid({ employees: initialEmployees, daysInMonth, sundays, holidays, locked }: AttendanceGridProps) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);

  const sundaySet = new Set(sundays);
  const holidaySet = new Map(holidays.map((h) => [h.day, h.name]));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function handleUpdate(employeeIdx: number, day: number, newValue: string | null) {
    setEmployees((prev) => {
      const next = [...prev];
      next[employeeIdx] = {
        ...next[employeeIdx],
        days: { ...next[employeeIdx].days, [String(day)]: newValue },
      };
      return next;
    });
  }

  const thStyle: React.CSSProperties = {
    padding: "8px 6px",
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    background: "var(--bg-2)",
    position: "sticky",
    top: 0,
    zIndex: 2,
    whiteSpace: "nowrap",
    textAlign: "center" as const,
    borderBottom: "1px solid var(--glass-border)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          minWidth: 1500,
          borderCollapse: "collapse",
          fontSize: 12,
          width: "100%",
        }}
      >
        <thead>
          <tr>
            {/* Fixed columns */}
            <th style={{ ...thStyle, textAlign: "left", width: 60, minWidth: 60, paddingLeft: 12 }}>Code</th>
            <th style={{ ...thStyle, textAlign: "left", width: 160, minWidth: 160 }}>Name</th>
            <th style={{ ...thStyle, textAlign: "left", width: 100, minWidth: 100 }}>Dept</th>

            {/* Day columns */}
            {days.map((d) => {
              const isSunday = sundaySet.has(d);
              const isHoliday = holidaySet.has(d);
              return (
                <th
                  key={d}
                  style={{
                    ...thStyle,
                    width: 34,
                    minWidth: 34,
                    background: isSunday
                      ? "rgba(255,69,58,0.08)"
                      : isHoliday
                      ? "rgba(100,210,255,0.08)"
                      : "var(--bg-2)",
                    color: isSunday ? "var(--red)" : isHoliday ? "var(--teal)" : "var(--text-3)",
                    padding: "8px 2px",
                  }}
                  title={isHoliday ? holidaySet.get(d) : isSunday ? "Sunday" : undefined}
                >
                  {d}
                </th>
              );
            })}

            {/* Summary columns */}
            <th style={{ ...thStyle, width: 44, color: "var(--green)" }}>WD</th>
            <th style={{ ...thStyle, width: 44, color: "rgba(10,132,255,0.7)" }}>WO</th>
            <th style={{ ...thStyle, width: 44, color: "var(--amber)" }}>OT</th>
            <th style={{ ...thStyle, width: 48, color: "var(--text-1)" }}>Pay</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, idx) => (
            <tr
              key={emp.recordId}
              style={{
                borderBottom: "1px solid var(--glass-border)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Code */}
              <td style={{ padding: "8px 6px 8px 12px", color: "var(--text-3)", fontSize: 10, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {emp.employeeCode}
              </td>

              {/* Name */}
              <td style={{ padding: "8px 6px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap" }}>{emp.name}</div>
              </td>

              {/* Dept */}
              <td style={{ padding: "8px 6px", color: "var(--text-2)", fontSize: 10, whiteSpace: "nowrap" }}>
                {emp.department}
              </td>

              {/* Day cells */}
              {days.map((d) => (
                <AttendanceDayCell
                  key={d}
                  recordId={emp.recordId}
                  day={d}
                  value={emp.days[String(d)] ?? null}
                  locked={locked}
                  onUpdate={(day, newValue) => handleUpdate(idx, day, newValue)}
                />
              ))}

              {/* Summary */}
              <td style={{ padding: "8px 4px", textAlign: "center", color: "var(--green)", fontWeight: 700, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                {emp.workedDays !== null ? emp.workedDays : "—"}
              </td>
              <td style={{ padding: "8px 4px", textAlign: "center", color: "rgba(10,132,255,0.7)", fontWeight: 700, fontSize: 12 }}>
                {emp.weekOffs !== null ? emp.weekOffs : "—"}
              </td>
              <td style={{ padding: "8px 4px", textAlign: "center", color: "var(--amber)", fontWeight: 700, fontSize: 12 }}>
                {emp.otDays !== null ? emp.otDays : "—"}
              </td>
              <td style={{ padding: "8px 4px", textAlign: "center", color: "var(--text-1)", fontWeight: 800, fontSize: 12 }}>
                {emp.payableDays !== null ? emp.payableDays : "—"}
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={3 + daysInMonth + 4} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)" }}>
                No employees found for selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
