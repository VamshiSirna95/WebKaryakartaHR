"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/leave": "Leave Management",
  "/salary": "Salary Processing",
  "/advances": "Advances & Loans",
  "/compliance": "PF/ESI/PT",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const title = ROUTE_TITLES[pathname] ?? "KARYAKARTA";

  return (
    <header
      style={{
        height: 56,
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* Page title */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginRight: "auto" }}>
        {title}
      </h2>

      {/* Entity selector */}
      <select
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xs)",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-2)",
          cursor: "pointer",
          outline: "none",
        }}
        defaultValue="MGBT"
      >
        <option value="MGBT">MGBT</option>
        <option value="KMF">KMF</option>
      </select>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xs)",
          padding: "6px 12px",
          width: 200,
        }}
      >
        <Search size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12,
            color: "var(--text-1)",
            width: "100%",
          }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xs)",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 16,
          transition: "var(--transition)",
        }}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </button>
    </header>
  );
}
