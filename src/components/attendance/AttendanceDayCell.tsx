"use client";

const CYCLE: (string | null)[] = [null, "P", "A", "HD", "WO", "PH", "SL", "CL", "EL"];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  P:   { color: "var(--green)",  bg: "rgba(48,209,88,0.12)" },
  A:   { color: "var(--red)",    bg: "rgba(255,69,58,0.12)" },
  HD:  { color: "var(--amber)",  bg: "rgba(255,214,10,0.12)" },
  WO:  { color: "rgba(10,132,255,0.5)", bg: "rgba(10,132,255,0.06)" },
  PH:  { color: "var(--teal)",   bg: "rgba(100,210,255,0.12)" },
  SL:  { color: "var(--purple)", bg: "rgba(191,90,242,0.12)" },
  CL:  { color: "var(--pink)",   bg: "rgba(255,55,95,0.12)" },
  EL:  { color: "var(--orange)", bg: "rgba(255,159,10,0.12)" },
};

interface AttendanceDayCellProps {
  recordId: string;
  day: number;
  value: string | null;
  locked: boolean;
  onUpdate: (day: number, newValue: string | null) => void;
}

export function AttendanceDayCell({ recordId, day, value, locked, onUpdate }: AttendanceDayCellProps) {
  const style = value ? STATUS_STYLE[value] : null;

  async function handleClick() {
    if (locked) return;
    const currentIndex = CYCLE.indexOf(value);
    const nextIndex = (currentIndex + 1) % CYCLE.length;
    const nextValue = CYCLE[nextIndex] ?? null;

    // Optimistic update
    onUpdate(day, nextValue);

    // Persist
    try {
      await fetch("/api/attendance/mark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, day, status: nextValue }),
      });
    } catch {
      // Revert on error
      onUpdate(day, value);
    }
  }

  return (
    <td
      onClick={handleClick}
      style={{
        width: 34,
        minWidth: 34,
        padding: "4px 2px",
        textAlign: "center",
        cursor: locked ? "default" : "pointer",
        userSelect: "none",
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 22,
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.01em",
          background: style?.bg ?? "transparent",
          color: style?.color ?? "var(--text-4)",
          transition: "background 0.15s, color 0.15s",
        }}
      >
        {value ?? "·"}
      </span>
    </td>
  );
}
