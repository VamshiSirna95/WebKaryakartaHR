import { db } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { Users, UserCheck, IndianRupee, Shield } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { ModuleCard } from "@/components/ui/ModuleCard";
import Link from "next/link";

export default async function DashboardPage() {
  const [totalEmployees, activeEmployees, probationEmployees, salaryAgg] =
    await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.employee.count({ where: { status: "PROBATION" } }),
      db.employee.aggregate({ _sum: { salary: true } }),
    ]);

  const totalSalary = Number(salaryAgg._sum.salary ?? 0);

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard
          color="blue"
          icon={<Users size={16} />}
          value={String(totalEmployees)}
          label="Total Employees"
          change={{ value: "+3 this month", direction: "up" }}
        />
        <MetricCard
          color="green"
          icon={<UserCheck size={16} />}
          value="65 / 78"
          label="Present Today (84%)"
        />
        <MetricCard
          color="amber"
          icon={<IndianRupee size={16} />}
          value={formatINR(totalSalary)}
          label="Monthly Payroll"
        />
        <MetricCard
          color="purple"
          icon={<Shield size={16} />}
          value="3"
          label="Compliance Alerts"
          change={{ value: "Action needed", direction: "down" }}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <Link
          href="/salary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-xs)",
            background: "var(--blue)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "var(--transition)",
          }}
        >
          Run Payroll
        </Link>
        <Link
          href="/attendance"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-xs)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "var(--transition)",
          }}
        >
          Mark Attendance
        </Link>
        <Link
          href="/employees/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-xs)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "var(--transition)",
          }}
        >
          Add Employee
        </Link>
      </div>

      {/* Section Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>Modules</h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
          Quick access to all HR operations
        </p>
      </div>

      {/* Module Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        <ModuleCard
          title="Employees"
          description="Manage employee records, documents, and organizational structure"
          tags={[
            { label: "People", color: "blue" },
            { label: "Records", color: "pink" },
          ]}
          stats={[
            { value: String(totalEmployees), label: "Total", color: "blue" },
            { value: String(activeEmployees), label: "Active", color: "green" },
            { value: String(probationEmployees), label: "Probation", color: "amber" },
          ]}
          buttonLabel="View Employees"
          buttonColor="blue"
          href="/employees"
          canvasType="dots"
        />
        <ModuleCard
          title="Attendance"
          description="Track daily attendance, shifts, and overtime across all locations"
          tags={[{ label: "Operations", color: "green" }]}
          stats={[
            { value: "65", label: "Present", color: "green" },
            { value: "8", label: "Absent", color: "red" },
            { value: "5", label: "Half Day", color: "amber" },
          ]}
          buttonLabel="Mark Attendance"
          buttonColor="green"
          href="/attendance"
          canvasType="waves"
        />
        <ModuleCard
          title="Salary Processing"
          description="Process monthly salaries with automatic PF, ESI, and PT calculations"
          tags={[
            { label: "Payroll", color: "amber" },
            { label: "Finance", color: "purple" },
          ]}
          stats={[
            { value: formatINR(totalSalary), label: "Gross", color: "amber" },
            { value: formatINR(totalSalary * 0.12), label: "Deductions", color: "red" },
            { value: formatINR(totalSalary * 0.88), label: "Net", color: "green" },
          ]}
          buttonLabel="Process Salary"
          buttonColor="amber"
          href="/salary"
          canvasType="chevrons"
        />
        <ModuleCard
          title="PF/ESI/PT"
          description="Manage statutory compliance filings, returns, and challan generation"
          tags={[{ label: "Compliance", color: "purple" }]}
          stats={[
            { value: "12", label: "Filed", color: "green" },
            { value: "3", label: "Overdue", color: "red" },
            { value: "2", label: "Due Soon", color: "amber" },
          ]}
          buttonLabel="View Compliance"
          buttonColor="purple"
          href="/compliance"
          canvasType="nebula"
        />
        <ModuleCard
          title="Leave Management"
          description="Handle leave requests, balances, and holiday calendar management"
          tags={[{ label: "Operations", color: "teal" }]}
          stats={[
            { value: "5", label: "Pending", color: "amber" },
            { value: "142", label: "Approved", color: "green" },
            { value: "8", label: "Rejected", color: "red" },
          ]}
          buttonLabel="Manage Leave"
          buttonColor="teal"
          href="/leave"
          canvasType="pulse"
        />
        <ModuleCard
          title="Advances & Loans"
          description="Track salary advances, loans, and EMI recovery schedules"
          tags={[
            { label: "Finance", color: "red" },
            { label: "Recovery", color: "amber" },
          ]}
          stats={[
            { value: formatINR(85000), label: "Outstanding", color: "red" },
            { value: formatINR(42000), label: "Recovered", color: "green" },
            { value: "7", label: "Active", color: "blue" },
          ]}
          buttonLabel="View Advances"
          buttonColor="red"
          href="/advances"
          canvasType="bars"
        />
      </div>
    </div>
  );
}
