import { db } from "@/lib/db";
import { AppShellClient } from "./AppShellClient";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let employeeCount = 0;
  try {
    employeeCount = await db.employee.count();
  } catch {
    // DB unavailable — use 0
  }
  return <AppShellClient employeeCount={employeeCount}>{children}</AppShellClient>;
}
