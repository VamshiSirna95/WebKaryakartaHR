import { db } from "@/lib/db";
import { formatINR, getInitials, getAvatarGradient } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Users, UserCheck, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { EmployeeTable } from "@/components/ui/EmployeeTable";

interface SearchParams {
  location?: string;
  department?: string;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locationFilter = params.location;
  const departmentFilter = params.department;

  const where: Record<string, unknown> = {};
  if (locationFilter && locationFilter !== "all") {
    where.locationId = locationFilter;
  }
  if (departmentFilter && departmentFilter !== "all") {
    where.departmentId = departmentFilter;
  }

  const [employees, locations, departments, totalCount, activeCount, probationCount] =
    await Promise.all([
      db.employee.findMany({
        where,
        include: { department: true, designation: true, location: true },
        orderBy: { employeeCode: "asc" },
      }),
      db.location.findMany({ orderBy: { name: "asc" } }),
      db.department.findMany({ orderBy: { name: "asc" } }),
      db.employee.count({ where }),
      db.employee.count({ where: { ...where, status: "ACTIVE" } }),
      db.employee.count({ where: { ...where, status: "PROBATION" } }),
    ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = await db.employee.count({
    where: { ...where, dateOfJoining: { gte: startOfMonth } },
  });

  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const serializedEmployees = employees.map((emp) => ({
    id: emp.id,
    employeeCode: emp.employeeCode,
    fullName: emp.fullName,
    departmentName: emp.department.name,
    designationName: emp.designation.name,
    locationName: emp.location.name,
    salary: Number(emp.salary),
    status: emp.status as "ACTIVE" | "PROBATION" | "NOTICE" | "SEPARATED",
  }));

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>
          Employees
        </h1>

        <FilterSelect
          name="location"
          defaultValue={locationFilter ?? "all"}
          options={locationOptions}
        />
        <FilterSelect
          name="department"
          defaultValue={departmentFilter ?? "all"}
          options={departmentOptions}
        />

        <div style={{ flex: 1 }} />

        <button
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-xs)",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Export
        </button>

        <Link
          href="/employees/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: "var(--radius-xs)",
            background: "var(--blue)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Add Employee
        </Link>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard color="blue" icon={<Users size={16} />} value={String(totalCount)} label="Total Employees" />
        <MetricCard color="green" icon={<UserCheck size={16} />} value={String(activeCount)} label="Active" />
        <MetricCard color="amber" icon={<Clock size={16} />} value={String(probationCount)} label="Probation" />
        <MetricCard color="blue" icon={<UserPlus size={16} />} value={String(newThisMonth)} label="New This Month" />
      </div>

      {/* Employee Table */}
      <EmployeeTable employees={serializedEmployees} />
    </div>
  );
}
