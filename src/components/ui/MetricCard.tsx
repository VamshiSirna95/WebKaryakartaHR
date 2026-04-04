"use client";

import type { ReactNode } from "react";

interface MetricCardProps {
  color: "blue" | "green" | "amber" | "purple" | "red";
  icon: ReactNode;
  value: string;
  label: string;
  change?: {
    value: string;
    direction: "up" | "down";
  };
}

const COLOR_MAP: Record<string, { accent: string; bg: string }> = {
  blue: { accent: "var(--blue)", bg: "var(--blue-bg)" },
  green: { accent: "var(--green)", bg: "var(--green-bg)" },
  amber: { accent: "var(--amber)", bg: "var(--amber-bg)" },
  purple: { accent: "var(--purple)", bg: "var(--purple-bg)" },
  red: { accent: "var(--red)", bg: "var(--red-bg)" },
};

export function MetricCard({ color, icon, value, label, change }: MetricCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: "hidden",
        transition: "var(--transition)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top color bar */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, ${colors.accent}, transparent)`,
        }}
      />
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-xs)",
              background: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.accent,
            }}
          >
            {icon}
          </div>
          {change && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 600,
                color: change.direction === "up" ? "var(--green)" : "var(--red)",
              }}
            >
              {change.direction === "up" ? "↑" : "↓"} {change.value}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.accent,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
