"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellClientProps {
  children: React.ReactNode;
  employeeCount: number;
}

export function AppShellClient({ children, employeeCount }: AppShellClientProps) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar employeeCount={employeeCount} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
