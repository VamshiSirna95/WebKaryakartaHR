"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Calendar,
  Clock,
  IndianRupee,
  Wallet,
  Shield,
  FileText,
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutGrid size={18} /> },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", href: "/employees", icon: <Users size={18} />, badge: "78" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Attendance", href: "/attendance", icon: <Calendar size={18} /> },
      { label: "Leave", href: "/leave", icon: <Clock size={18} /> },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Salary Processing", href: "/salary", icon: <IndianRupee size={18} />, badge: "Due", badgeColor: "amber" },
      { label: "Advances & Loans", href: "/advances", icon: <Wallet size={18} /> },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "PF/ESI/PT", href: "/compliance", icon: <Shield size={18} />, badge: "3", badgeColor: "red" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/reports", icon: <FileText size={18} /> },
      { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        height: "100vh",
        background: "var(--bg-1)",
        borderRight: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "24px 20px 16px" }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, var(--blue), var(--purple))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          KARYAKARTA
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>
          HR & Payroll
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 8 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-4)",
                padding: "12px 8px 6px",
              }}
            >
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--blue)" : "var(--text-2)",
                    background: isActive ? "var(--blue-bg)" : "transparent",
                    textDecoration: "none",
                    position: "relative",
                    transition: "var(--transition)",
                    marginBottom: 2,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--glass-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        background: "var(--blue)",
                      }}
                    />
                  )}
                  <span style={{ opacity: isActive ? 1 : 0.7, display: "flex" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: item.badgeColor === "red"
                          ? "var(--red-bg)"
                          : item.badgeColor === "amber"
                          ? "var(--amber-bg)"
                          : "var(--glass)",
                        color: item.badgeColor === "red"
                          ? "var(--red)"
                          : item.badgeColor === "amber"
                          ? "var(--amber)"
                          : "var(--text-3)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--glass-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-xs)",
            background: "linear-gradient(135deg, var(--blue), var(--purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          VS
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>Vamshi S.</p>
          <p style={{ fontSize: 10, color: "var(--text-3)" }}>Super Admin</p>
        </div>
      </div>
    </aside>
  );
}
