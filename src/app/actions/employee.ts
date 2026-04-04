"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

function str(fd: FormData, key: string): string {
  return (fd.get(key) as string | null) ?? "";
}

function optStr(fd: FormData, key: string): string | undefined {
  const v = str(fd, key);
  return v || undefined;
}

function optDate(fd: FormData, key: string): Date | undefined {
  const v = str(fd, key);
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function generateNextCode(employees: { employeeCode: string }[]): string {
  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employeeCode.match(/^E(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `E${String(maxNum + 1).padStart(3, "0")}`;
}

export async function createEmployee(
  formData: FormData
): Promise<{ error: string } | undefined> {
  // Required field validation
  const fullName = str(formData, "fullName").trim();
  const contact1 = str(formData, "contact1").trim();
  const entityId = str(formData, "entityId");
  const locationId = str(formData, "locationId");
  const departmentId = str(formData, "departmentId");
  const designationId = str(formData, "designationId");
  const dateOfJoiningStr = str(formData, "dateOfJoining");
  const salaryStr = str(formData, "salary");

  if (!fullName) return { error: "Full Name is required." };
  if (!contact1) return { error: "Contact 1 is required." };
  if (!entityId) return { error: "Entity is required." };
  if (!locationId) return { error: "Location is required." };
  if (!departmentId) return { error: "Department is required." };
  if (!designationId) return { error: "Designation is required." };
  if (!dateOfJoiningStr) return { error: "Date of Joining is required." };
  if (!salaryStr) return { error: "Monthly Salary is required." };

  const dateOfJoining = new Date(dateOfJoiningStr);
  if (isNaN(dateOfJoining.getTime())) return { error: "Invalid Date of Joining." };

  const salary = parseFloat(salaryStr);
  if (isNaN(salary) || salary <= 0) return { error: "Salary must be a positive number." };

  // Auto-compute salary split
  const basic = Math.round(salary * 0.7);
  const hra = Math.round(salary * 0.2);
  const specialAllow = salary - basic - hra;
  const travelAllow = parseFloat(str(formData, "travelAllow")) || 0;

  // Auto-compute UAN status
  const uanNumber = optStr(formData, "uanNumber");
  const uanStatus = uanNumber ? "GENERATED" : "NOT_GENERATED";

  // Auto-compute ESI status
  const esiNumber = optStr(formData, "esiNumber");
  let esiStatus = str(formData, "esiStatus") || "NOT_GENERATED";
  // If salary > ₹21,000 → EXEMPTED
  if (salary > 21000) {
    esiStatus = "EXEMPTED";
  } else if (esiNumber) {
    esiStatus = "GENERATED";
  }

  // Generate employee code
  const existingEmployees = await db.employee.findMany({ select: { employeeCode: true } });
  const employeeCode = generateNextCode(existingEmployees);

  await db.employee.create({
    data: {
      employeeCode,
      fullName,
      careOfName: optStr(formData, "careOfName"),
      careOfRelation: optStr(formData, "careOfRelation"),
      dateOfBirth: optDate(formData, "dateOfBirth"),
      gender: optStr(formData, "gender"),
      bloodGroup: optStr(formData, "bloodGroup"),
      aadhaarNumber: optStr(formData, "aadhaarNumber"),
      panNumber: optStr(formData, "panNumber"),
      contact1,
      contact2: optStr(formData, "contact2"),
      presentAddress: optStr(formData, "presentAddress"),
      permanentAddress: optStr(formData, "permanentAddress"),
      bankAccountNo: optStr(formData, "bankAccountNo"),
      bankName: optStr(formData, "bankName"),
      bankIfsc: optStr(formData, "bankIfsc"),
      bankBranch: optStr(formData, "bankBranch"),
      uanNumber,
      uanStatus,
      esiNumber,
      esiStatus,
      entityId,
      locationId,
      departmentId,
      subDepartmentId: optStr(formData, "subDepartmentId"),
      designationId,
      shiftCodeId: optStr(formData, "shiftCodeId"),
      dateOfJoining,
      dateOfJoiningCurrent: optDate(formData, "dateOfJoiningCurrent"),
      bonusMonth: str(formData, "bonusMonth") ? parseInt(str(formData, "bonusMonth"), 10) : undefined,
      appraisalDate: optDate(formData, "appraisalDate"),
      status: str(formData, "status") || "ACTIVE",
      salary,
      basic,
      hra,
      specialAllow,
      travelAllow,
    },
  });

  redirect("/employees");
}

export async function updateEmployee(
  id: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const fullName = str(formData, "fullName").trim();
  const contact1 = str(formData, "contact1").trim();
  const entityId = str(formData, "entityId");
  const locationId = str(formData, "locationId");
  const departmentId = str(formData, "departmentId");
  const designationId = str(formData, "designationId");
  const dateOfJoiningStr = str(formData, "dateOfJoining");
  const salaryStr = str(formData, "salary");

  if (!fullName) return { error: "Full Name is required." };
  if (!contact1) return { error: "Contact 1 is required." };
  if (!entityId) return { error: "Entity is required." };
  if (!locationId) return { error: "Location is required." };
  if (!departmentId) return { error: "Department is required." };
  if (!designationId) return { error: "Designation is required." };
  if (!dateOfJoiningStr) return { error: "Date of Joining is required." };
  if (!salaryStr) return { error: "Monthly Salary is required." };

  const dateOfJoining = new Date(dateOfJoiningStr);
  if (isNaN(dateOfJoining.getTime())) return { error: "Invalid Date of Joining." };

  const salary = parseFloat(salaryStr);
  if (isNaN(salary) || salary <= 0) return { error: "Salary must be a positive number." };

  const basic = Math.round(salary * 0.7);
  const hra = Math.round(salary * 0.2);
  const specialAllow = salary - basic - hra;
  const travelAllow = parseFloat(str(formData, "travelAllow")) || 0;

  const uanNumber = optStr(formData, "uanNumber");
  const uanStatus = uanNumber ? "GENERATED" : "NOT_GENERATED";

  const esiNumber = optStr(formData, "esiNumber");
  let esiStatus = str(formData, "esiStatus") || "NOT_GENERATED";
  if (salary > 21000) {
    esiStatus = "EXEMPTED";
  } else if (esiNumber) {
    esiStatus = "GENERATED";
  }

  await db.employee.update({
    where: { id },
    data: {
      fullName,
      careOfName: optStr(formData, "careOfName"),
      careOfRelation: optStr(formData, "careOfRelation"),
      dateOfBirth: optDate(formData, "dateOfBirth"),
      gender: optStr(formData, "gender"),
      bloodGroup: optStr(formData, "bloodGroup"),
      aadhaarNumber: optStr(formData, "aadhaarNumber"),
      panNumber: optStr(formData, "panNumber"),
      contact1,
      contact2: optStr(formData, "contact2"),
      presentAddress: optStr(formData, "presentAddress"),
      permanentAddress: optStr(formData, "permanentAddress"),
      bankAccountNo: optStr(formData, "bankAccountNo"),
      bankName: optStr(formData, "bankName"),
      bankIfsc: optStr(formData, "bankIfsc"),
      bankBranch: optStr(formData, "bankBranch"),
      uanNumber,
      uanStatus,
      esiNumber,
      esiStatus,
      entityId,
      locationId,
      departmentId,
      subDepartmentId: optStr(formData, "subDepartmentId"),
      designationId,
      shiftCodeId: optStr(formData, "shiftCodeId"),
      dateOfJoining,
      dateOfJoiningCurrent: optDate(formData, "dateOfJoiningCurrent"),
      bonusMonth: str(formData, "bonusMonth") ? parseInt(str(formData, "bonusMonth"), 10) : undefined,
      appraisalDate: optDate(formData, "appraisalDate"),
      status: str(formData, "status") || "ACTIVE",
      salary,
      basic,
      hra,
      specialAllow,
      travelAllow,
    },
  });

  redirect(`/employees/${id}`);
}
