"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Entity { id: string; code: string; name: string; }
interface Location { id: string; name: string; entityId: string; }

interface AttendanceData {
  monthId: string;
  year: number;
  month: number;
  daysInMonth: number;
  status: "OPEN" | "LOCKED";
  sundays: number[];
  holidays: { day: number; name: string }[];
  employees: {
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
  }[];
}

const LEGEND = [
  { code: "P",  label: "Present",    color: "var(--green)"  },
  { code: "A",  label: "Absent",     color: "var(--red)"    },
  { code: "HD", label: "Half Day",   color: "var(--amber)"  },
  { code: "WO", label: "Week Off",   color: "rgba(10,132,255,0.5)" },
  { code: "PH", label: "Public Hol", color: "var(--teal)"   },
  { code: "SL", label: "Sick Leave", color: "var(--purple)" },
  { code: "CL", label: "Casual Lv.", color: "var(--pink)"   },
  { code: "EL", label: "Earned Lv.", color: "var(--orange)" },
];

const btnSecondary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-xs)",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "var(--transition)",
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-xs)",
  background: "var(--blue)",
  border: "none",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "var(--transition)",
};

export default function AttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [entityId, setEntityId] = useState("");
  const [locationId, setLocationId] = useState("all");

  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load entities/locations on mount
  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((opts: { entities: Entity[]; locations: Location[] }) => {
        setEntities(opts.entities ?? []);
        setLocations(opts.locations ?? []);
        if (opts.entities?.length > 0) setEntityId(opts.entities[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      entityId,
      ...(locationId !== "all" ? { locationId } : {}),
    });
    fetch(`/api/attendance?${params}`)
      .then((r) => r.json())
      .then((d: AttendanceData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month, entityId, locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function doAction(endpoint: string, body: object, label: string) {
    if (!data) return;
    setActionLoading(label);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      fetchData();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLock() {
    if (!data) return;
    setActionLoading("lock");
    try {
      await fetch("/api/attendance/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthId: data.monthId }),
      });
      fetchData();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  // Metrics: count today's statuses
  const todayDay = now.getDate();
  const todayStr = String(todayDay);
  let presentCount = 0, absentCount = 0, leaveCount = 0;
  if (data) {
    for (const emp of data.employees) {
      const val = emp.days[todayStr];
      if (val === "P" || val === "PH") presentCount++;
      else if (val === "A") absentCount++;
      else if (val === "SL" || val === "CL" || val === "EL") leaveCount++;
    }
  }

  const filteredLocations = locations.filter((l) => !entityId || l.entityId === entityId);
  const isLocked = data?.status === "LOCKED";

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Attendance</h1>

        {/* Location filter */}
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          <option value="all">All Locations</option>
          {filteredLocations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Month select */}
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        {/* Year select */}
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ ...btnSecondary, appearance: "none", paddingRight: 24 }}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          style={btnSecondary}
          disabled={!data || !!actionLoading}
          onClick={() => doAction("/api/attendance/auto-weekoffs", { monthId: data?.monthId }, "weekoffs")}
        >
          {actionLoading === "weekoffs" ? "Applying…" : "Auto Week-Offs"}
        </button>
        <button
          style={btnSecondary}
          disabled={!data || !!actionLoading}
          onClick={() => doAction("/api/attendance/compute", { monthId: data?.monthId }, "compute")}
        >
          {actionLoading === "compute" ? "Computing…" : "Compute"}
        </button>
        <button style={btnSecondary}>Export</button>

        {/* Status pill */}
        {data && (
          <span style={{
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: isLocked ? "var(--red-bg)" : "var(--green-bg)",
            color: isLocked ? "var(--red)" : "var(--green)",
          }}>
            ● {isLocked ? "Locked" : "Open"}
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <MetricCard
          color="blue"
          icon={<Users size={16} />}
          value={String(data?.employees.length ?? 0)}
          label="Total Employees"
        />
        <MetricCard
          color="green"
          icon={<UserCheck size={16} />}
          value={String(presentCount)}
          label="Present Today"
        />
        <MetricCard
          color="red"
          icon={<UserX size={16} />}
          value={String(absentCount)}
          label="Absent Today"
        />
        <MetricCard
          color="amber"
          icon={<Clock size={16} />}
          value={String(leaveCount)}
          label="On Leave"
        />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {LEGEND.map((item) => (
          <div key={item.code} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 18,
              borderRadius: 3,
              fontSize: 9,
              fontWeight: 800,
              color: item.color,
              background: item.color.replace("var(--", "").replace(")", "").startsWith("rgba")
                ? item.color.replace("0.5)", "0.12)")
                : undefined,
            }}>
              {item.code}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="glass-card" style={{ overflow: "hidden", marginBottom: 16 }}>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
            Loading attendance data…
          </div>
        ) : data ? (
          <AttendanceGrid
            key={`${data.monthId}-${locationId}`}
            employees={data.employees}
            daysInMonth={data.daysInMonth}
            sundays={data.sundays}
            holidays={data.holidays}
            locked={isLocked}
          />
        ) : (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-3)" }}>
            Select filters to load attendance data.
          </div>
        )}
      </div>

      {/* Footer */}
      {data && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {MONTHS[data.month - 1]} {data.year} · {data.daysInMonth} days · {data.sundays.length} Sundays · Status:{" "}
            <strong style={{ color: isLocked ? "var(--red)" : "var(--green)" }}>
              {isLocked ? "Locked" : "Open"}
            </strong>
          </span>
          <div style={{ flex: 1 }} />
          {!isLocked && (
            <button
              style={btnSecondary}
              disabled={!!actionLoading}
              onClick={handleLock}
            >
              {actionLoading === "lock" ? "Locking…" : "Lock Month"}
            </button>
          )}
          <button
            style={btnPrimary}
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      )}
    </div>
  );
}
