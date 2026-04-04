"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LeaveEntry {
  employeeCode: string;
  fullName: string;
  leaveTypeCode: string;
}

interface CalendarDay {
  date: number;
  entries: LeaveEntry[];
}

interface LeaveRequest {
  fromDate: string;
  toDate: string;
  days: number;
  employee: { employeeCode: string; fullName: string };
  leaveType: { code: string; name: string };
}

interface Props {
  entityId: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CL:  { bg: "rgba(255, 100, 130, 0.2)", color: "#e5446d" },
  SL:  { bg: "rgba(160, 80, 220, 0.2)",  color: "#9b59b6" },
  EL:  { bg: "rgba(255, 140, 0, 0.2)",   color: "#cc7700" },
  PL:  { bg: "rgba(0, 120, 220, 0.2)",   color: "var(--blue)" },
  ML:  { bg: "rgba(0, 180, 160, 0.2)",   color: "#00b4a0" },
  PTL: { bg: "rgba(0, 200, 220, 0.2)",   color: "#00c8dc" },
  LOP: { bg: "rgba(220, 50, 50, 0.2)",   color: "var(--red)" },
};

export function LeaveCalendar({ entityId }: Props) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [dayMap, setDayMap] = useState<Map<number, LeaveEntry[]>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchCalendarData = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    const p = new URLSearchParams({ entityId, status: "APPROVED", month: String(calMonth), year: String(calYear) });
    fetch(`/api/leaves/requests?${p}`)
      .then((r) => r.json())
      .then((requests: LeaveRequest[]) => {
        const map = new Map<number, LeaveEntry[]>();

        for (const req of requests) {
          const from = new Date(req.fromDate);
          const to = new Date(req.toDate);
          const cur = new Date(from);
          cur.setUTCHours(0, 0, 0, 0);
          const end = new Date(to);
          end.setUTCHours(0, 0, 0, 0);

          while (cur <= end) {
            const reqYear = cur.getUTCFullYear();
            const reqMonth = cur.getUTCMonth() + 1;
            if (reqYear === calYear && reqMonth === calMonth) {
              const d = cur.getUTCDate();
              if (!map.has(d)) map.set(d, []);
              map.get(d)!.push({
                employeeCode: req.employee.employeeCode,
                fullName: req.employee.fullName,
                leaveTypeCode: req.leaveType.code,
              });
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
        setDayMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityId, calMonth, calYear]);

  useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

  function prevMonth() {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // Build calendar grid
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1);
  // getDay(): 0=Sun, 1=Mon ... 6=Sat → convert to Mon=0 ... Sun=6
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6; // Sunday → offset 6

  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, entries: dayMap.get(d) ?? [] });
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDate = now.getDate();
  const isCurrentMonth = now.getFullYear() === calYear && now.getMonth() + 1 === calMonth;

  return (
    <div>
      {/* Calendar Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", background: "var(--bg-2)" }}>
        <button onClick={prevMonth} style={{ padding: "4px 8px", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={15} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", minWidth: 160, textAlign: "center" }}>
          {MONTHS[calMonth - 1]} {calYear}
        </div>
        <button onClick={nextMonth} style={{ padding: "4px 8px", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center" }}>
          <ChevronRight size={15} />
        </button>
        {loading && <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: 8 }}>Loading…</span>}
        <div style={{ flex: 1 }} />
        {/* Legend */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TYPE_COLORS).map(([code, c]) => (
            <span key={code} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: c.bg, color: c.color }}>
              {code}
            </span>
          ))}
        </div>
      </div>

      {/* Weekday Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--bg-2)", borderBottom: "1px solid var(--glass-border)" }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 600, color: wd === "Sun" ? "var(--red)" : "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--bg-2)" }}>
        {cells.map((cell, i) => {
          const isToday = cell !== null && isCurrentMonth && cell.date === todayDate;
          const isSunday = i % 7 === 6;
          return (
            <div
              key={i}
              style={{
                minHeight: 80,
                padding: "6px 8px",
                borderRight: "1px solid var(--glass-border)",
                borderBottom: "1px solid var(--glass-border)",
                background: !cell ? "var(--glass)" : isSunday ? "rgba(220,50,50,0.03)" : "transparent",
                position: "relative",
              }}
            >
              {cell && (
                <>
                  <div style={{
                    fontSize: 12,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? "var(--blue)" : isSunday ? "var(--red)" : "var(--text-3)",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    {cell.date}
                    {isToday && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} />}
                  </div>
                  {/* Leave entries */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {cell.entries.slice(0, 3).map((entry, j) => {
                      const c = TYPE_COLORS[entry.leaveTypeCode] ?? TYPE_COLORS.LOP;
                      return (
                        <div key={j} style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: c.bg, color: c.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={`${entry.fullName} — ${entry.leaveTypeCode}`}>
                          {entry.employeeCode} {entry.leaveTypeCode}
                        </div>
                      );
                    })}
                    {cell.entries.length > 3 && (
                      <div style={{ fontSize: 9, color: "var(--text-4)", fontWeight: 600 }}>+{cell.entries.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
