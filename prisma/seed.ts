import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { computePayroll } from "../src/lib/payroll-engine";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data (in dependency order)
  await prisma.payrollDetail.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceMonth.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.subDepartment.deleteMany();
  await prisma.shiftCode.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();
  await prisma.location.deleteMany();
  await prisma.entity.deleteMany();

  // Entities
  const mgbt = await prisma.entity.create({
    data: {
      code: "MGBT",
      name: "Mangalagowri Textiles & Garments",
      legalName: "Mangalagowri Textiles & Garments Pvt. Ltd.",
      pfCode: "APHYD0044186000",
      gstin: "36AADCM1234F1ZP",
    },
  });

  const kmf = await prisma.entity.create({
    data: {
      code: "KMF",
      name: "K.M. Fashions",
      legalName: "K.M. Fashions",
      pfCode: "APHYD0055297000",
      gstin: "36AABCK5678G1ZQ",
    },
  });

  // Locations
  const locations = await Promise.all([
    prisma.location.create({ data: { code: "ASR", name: "AS Rao Nagar", entityId: mgbt.id } }),
    prisma.location.create({ data: { code: "MG_ASR", name: "MG AS Rao Nagar", entityId: mgbt.id } }),
    prisma.location.create({ data: { code: "MG_KPT", name: "MG Kothapet", entityId: mgbt.id } }),
    prisma.location.create({ data: { code: "WH", name: "Warehouse", entityId: mgbt.id } }),
    prisma.location.create({ data: { code: "BDP", name: "Boduppal", entityId: kmf.id } }),
    prisma.location.create({ data: { code: "SPN", name: "Shapur Nagar", entityId: kmf.id } }),
    prisma.location.create({ data: { code: "MG_AMP", name: "MG Ameerpet", entityId: kmf.id } }),
  ]);

  const [asrLoc, mgAsrLoc, mgKptLoc, whLoc, bdpLoc, spnLoc, mgAmpLoc] = locations;

  // Departments
  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Sales" } }),
    prisma.department.create({ data: { name: "Store Support" } }),
    prisma.department.create({ data: { name: "Administration" } }),
    prisma.department.create({ data: { name: "Finance" } }),
    prisma.department.create({ data: { name: "Purchase" } }),
    prisma.department.create({ data: { name: "Warehouse" } }),
    prisma.department.create({ data: { name: "Human Resources" } }),
  ]);

  const [salesDept, storeSupportDept, adminDept, financeDept, purchaseDept, warehouseDept, hrDept] = departments;

  // Sub-departments
  const subDepts = await Promise.all([
    prisma.subDepartment.create({ data: { name: "Fancy Sarees", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "Pattu Sarees", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "Handloom Sarees", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "Mens", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "Kids", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "LD Western", departmentId: salesDept.id } }),
    prisma.subDepartment.create({ data: { name: "Textile", departmentId: storeSupportDept.id } }),
    prisma.subDepartment.create({ data: { name: "RMDM", departmentId: storeSupportDept.id } }),
    prisma.subDepartment.create({ data: { name: "Bedsheet", departmentId: storeSupportDept.id } }),
  ]);

  const [fancySarees, pattuSarees, handloomSarees, mens, kids, ldWestern, textile, rmdm, bedsheet] = subDepts;

  // Designations
  const designations = await Promise.all([
    prisma.designation.create({ data: { name: "Manager" } }),
    prisma.designation.create({ data: { name: "Supervisor" } }),
    prisma.designation.create({ data: { name: "Sales Executive" } }),
    prisma.designation.create({ data: { name: "Cashier" } }),
    prisma.designation.create({ data: { name: "Helper" } }),
    prisma.designation.create({ data: { name: "Tailor" } }),
    prisma.designation.create({ data: { name: "Purchaser" } }),
    prisma.designation.create({ data: { name: "Executive" } }),
  ]);

  const [managerDesig, supervisorDesig, salesExecDesig, cashierDesig, helperDesig, tailorDesig, purchaserDesig, executiveDesig] = designations;

  // Shift codes
  await Promise.all([
    prisma.shiftCode.create({ data: { code: "SVIP", name: "Store VIP Shift", startTime: "09:00", endTime: "21:00" } }),
    prisma.shiftCode.create({ data: { code: "SGA", name: "Store General A", startTime: "09:30", endTime: "21:30" } }),
    prisma.shiftCode.create({ data: { code: "SLA", name: "Store Late A", startTime: "11:00", endTime: "21:00" } }),
    prisma.shiftCode.create({ data: { code: "SLB", name: "Store Late B", startTime: "12:00", endTime: "21:00" } }),
    prisma.shiftCode.create({ data: { code: "WHC", name: "Warehouse C", startTime: "08:00", endTime: "17:00" } }),
  ]);

  // Helper to compute salary split
  function salarySplit(ctc: number) {
    const basic = Math.round(ctc * 0.7);
    const hra = Math.round(ctc * 0.2);
    const special = ctc - basic - hra;
    return { salary: ctc, basic, hra, specialAllow: special, travelAllow: 0 };
  }

  // Employees
  const employees = [
    { employeeCode: "E001", fullName: "Rajesh Kumar Reddy", gender: "Male", entityId: mgbt.id, locationId: asrLoc.id, departmentId: salesDept.id, subDepartmentId: fancySarees.id, designationId: managerDesig.id, dateOfJoining: new Date("2019-03-15"), status: "ACTIVE", ...salarySplit(35000), contact1: "9876543210" },
    { employeeCode: "E002", fullName: "Lakshmi Devi Patel", gender: "Female", entityId: mgbt.id, locationId: asrLoc.id, departmentId: salesDept.id, subDepartmentId: pattuSarees.id, designationId: supervisorDesig.id, dateOfJoining: new Date("2020-06-01"), status: "ACTIVE", ...salarySplit(28000), contact1: "9876543211" },
    { employeeCode: "E003", fullName: "Venkata Srinivas Rao", gender: "Male", entityId: mgbt.id, locationId: mgAsrLoc.id, departmentId: salesDept.id, subDepartmentId: mens.id, designationId: salesExecDesig.id, dateOfJoining: new Date("2021-01-10"), status: "ACTIVE", ...salarySplit(18000), contact1: "9876543212" },
    { employeeCode: "E004", fullName: "Priya Sharma", gender: "Female", entityId: mgbt.id, locationId: mgKptLoc.id, departmentId: salesDept.id, subDepartmentId: kids.id, designationId: salesExecDesig.id, dateOfJoining: new Date("2022-08-20"), status: "PROBATION", ...salarySplit(15000), contact1: "9876543213" },
    { employeeCode: "E005", fullName: "Suresh Babu Naidu", gender: "Male", entityId: mgbt.id, locationId: whLoc.id, departmentId: warehouseDept.id, subDepartmentId: null, designationId: helperDesig.id, dateOfJoining: new Date("2020-11-05"), status: "ACTIVE", ...salarySplit(14000), contact1: "9876543214" },
    { employeeCode: "E006", fullName: "Anitha Kumari", gender: "Female", entityId: mgbt.id, locationId: asrLoc.id, departmentId: financeDept.id, subDepartmentId: null, designationId: cashierDesig.id, dateOfJoining: new Date("2021-04-12"), status: "ACTIVE", ...salarySplit(20000), contact1: "9876543215" },
    { employeeCode: "E007", fullName: "Ravi Teja Goud", gender: "Male", entityId: mgbt.id, locationId: mgAsrLoc.id, departmentId: storeSupportDept.id, subDepartmentId: textile.id, designationId: tailorDesig.id, dateOfJoining: new Date("2023-02-28"), status: "ACTIVE", ...salarySplit(16000), contact1: "9876543216" },
    { employeeCode: "E008", fullName: "Padmavathi Reddy", gender: "Female", entityId: kmf.id, locationId: bdpLoc.id, departmentId: salesDept.id, subDepartmentId: handloomSarees.id, designationId: supervisorDesig.id, dateOfJoining: new Date("2020-09-01"), status: "ACTIVE", ...salarySplit(26000), contact1: "9876543217" },
    { employeeCode: "E009", fullName: "Ganesh Prasad", gender: "Male", entityId: kmf.id, locationId: bdpLoc.id, departmentId: salesDept.id, subDepartmentId: ldWestern.id, designationId: salesExecDesig.id, dateOfJoining: new Date("2022-05-15"), status: "ACTIVE", ...salarySplit(17000), contact1: "9876543218" },
    { employeeCode: "E010", fullName: "Swathi Madhuri", gender: "Female", entityId: kmf.id, locationId: spnLoc.id, departmentId: salesDept.id, subDepartmentId: fancySarees.id, designationId: salesExecDesig.id, dateOfJoining: new Date("2024-01-08"), status: "PROBATION", ...salarySplit(14000), contact1: "9876543219" },
    { employeeCode: "E011", fullName: "Nagarjuna Yadav", gender: "Male", entityId: kmf.id, locationId: spnLoc.id, departmentId: purchaseDept.id, subDepartmentId: null, designationId: purchaserDesig.id, dateOfJoining: new Date("2021-07-20"), status: "ACTIVE", ...salarySplit(22000), contact1: "9876543220" },
    { employeeCode: "E012", fullName: "Kavitha Laxmi", gender: "Female", entityId: kmf.id, locationId: mgAmpLoc.id, departmentId: adminDept.id, subDepartmentId: null, designationId: executiveDesig.id, dateOfJoining: new Date("2022-03-10"), status: "ACTIVE", ...salarySplit(24000), contact1: "9876543221" },
    { employeeCode: "E013", fullName: "Mahesh Chandra", gender: "Male", entityId: mgbt.id, locationId: mgKptLoc.id, departmentId: storeSupportDept.id, subDepartmentId: rmdm.id, designationId: helperDesig.id, dateOfJoining: new Date("2023-11-01"), status: "PROBATION", ...salarySplit(12000), contact1: "9876543222" },
    { employeeCode: "E014", fullName: "Divya Bharathi", gender: "Female", entityId: mgbt.id, locationId: asrLoc.id, departmentId: hrDept.id, subDepartmentId: null, designationId: executiveDesig.id, dateOfJoining: new Date("2021-10-15"), status: "ACTIVE", ...salarySplit(25000), contact1: "9876543223" },
    { employeeCode: "E015", fullName: "Sai Krishna Murthy", gender: "Male", entityId: kmf.id, locationId: mgAmpLoc.id, departmentId: salesDept.id, subDepartmentId: pattuSarees.id, designationId: managerDesig.id, dateOfJoining: new Date("2018-06-01"), status: "ACTIVE", ...salarySplit(32000), contact1: "9876543224" },
  ];

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        ...emp,
        subDepartmentId: emp.subDepartmentId ?? undefined,
      },
    });
  }

  // ─── Attendance seed for MGBT April 2026 ───────────────────────────────────
  const YEAR = 2026;
  const MONTH = 4;
  const SUNDAYS = new Set([5, 12, 19, 26]);
  const HOLIDAY_DAY = 14;
  const TODAY_DAY = 4;
  const RANDOM_STATUSES = ["P", "P", "P", "P", "P", "P", "P", "P", "A", "HD", "SL", "CL"];

  function pickStatus(day: number): string | null {
    if (day > TODAY_DAY) return null;
    if (SUNDAYS.has(day)) return "WO";
    if (day === HOLIDAY_DAY) return "PH";
    return RANDOM_STATUSES[Math.floor(Math.random() * RANDOM_STATUSES.length)];
  }

  await prisma.holiday.deleteMany({ where: { date: new Date(`${YEAR}-04-14`) } });
  await prisma.holiday.create({
    data: { date: new Date(`${YEAR}-04-14`), name: "Ambedkar Jayanti" },
  });

  const attendanceMonth = await prisma.attendanceMonth.upsert({
    where: { year_month_entityId: { year: YEAR, month: MONTH, entityId: mgbt.id } },
    update: {},
    create: { year: YEAR, month: MONTH, entityId: mgbt.id, status: "OPEN" },
  });

  const mgbtEmployees = await prisma.employee.findMany({
    where: { entityId: mgbt.id },
    include: { designation: true },
  });

  // Seed attendance records + compute summary fields
  const attendanceInputs: { employeeId: string; workedDays: number; payableDays: number; otDays: number }[] = [];

  for (const emp of mgbtEmployees) {
    const dayData: Record<string, string | null> = {};
    let workedDays = 0;
    let weekOffs = 0;
    for (let d = 1; d <= 30; d++) {
      const status = pickStatus(d);
      dayData[`day${d}`] = status;
      if (status === "P" || status === "PH") workedDays += 1;
      else if (status === "HD") workedDays += 0.5;
      else if (status === "WO") weekOffs += 1;
    }
    const total = workedDays + weekOffs;
    const otDays = Math.max(0, total - 30);
    const payableDays = total - otDays;

    await prisma.attendanceRecord.upsert({
      where: { attendanceMonthId_employeeId: { attendanceMonthId: attendanceMonth.id, employeeId: emp.id } },
      update: { ...dayData, workedDays, weekOffs, otDays, payableDays },
      create: { attendanceMonthId: attendanceMonth.id, employeeId: emp.id, ...dayData, workedDays, weekOffs, otDays, payableDays },
    });

    attendanceInputs.push({ employeeId: emp.id, workedDays, payableDays, otDays });
  }

  // ─── Payroll seed for MGBT April 2026 ────────────────────────────────────
  const payrollRun = await prisma.payrollRun.create({
    data: { entityId: mgbt.id, year: YEAR, month: MONTH, status: "PROCESSED", processedAt: new Date() },
  });

  let totalGross = 0, totalDeductions = 0, totalNet = 0;

  for (const emp of mgbtEmployees) {
    const att = attendanceInputs.find((a) => a.employeeId === emp.id);
    const attInput = {
      payableDays: att?.payableDays ?? 0,
      workedDays: att?.workedDays ?? 0,
      otDays: att?.otDays ?? 0,
      leaveEncashDays: 0,
      labourHoliday: 0,
    };
    const empInput = {
      salary: Number(emp.salary),
      ta: Number(emp.travelAllow),
      uanNumber: emp.uanNumber,
      esiNumber: emp.esiNumber,
    };
    const result = computePayroll(empInput, attInput, 0);

    await prisma.payrollDetail.create({
      data: {
        payrollRunId: payrollRun.id,
        employeeId: emp.id,
        payableDays: attInput.payableDays,
        workedDays: attInput.workedDays,
        otDays: attInput.otDays,
        leaveEncashDays: 0,
        labourHoliday: 0,
        salary: empInput.salary,
        basic: result.basic,
        hra: result.hra,
        specialAllowance: result.specialAllowance,
        bonus: result.bonus,
        ta: result.ta,
        lec: result.lec,
        perDaySalary: result.perDaySalary,
        earnedBasic: result.earnedBasic,
        earnedHra: result.earnedHra,
        earnedSpecial: result.earnedSpecial,
        earnedOt: result.earnedOt,
        earnedLeave: result.earnedLeave,
        earnedLabour: result.earnedLabour,
        earnedTa: result.earnedTa,
        salaryArrears: 0,
        grossSalary: result.grossSalary,
        pfEmployee: result.pfEmployee,
        pfEmployer: result.pfEmployer,
        esiEmployee: result.esiEmployee,
        esiEmployer: result.esiEmployer,
        professionalTax: result.professionalTax,
        totalDeductions: result.totalDeductions,
        netSalary: result.netSalary,
        gratuity: result.gratuity,
        ctc: result.ctc,
      },
    });

    totalGross += result.grossSalary;
    totalDeductions += result.totalDeductions;
    totalNet += result.netSalary;
  }

  await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: {
      totalGross,
      totalDeductions,
      totalNet,
      employeeCount: mgbtEmployees.length,
    },
  });

  console.log("Seed completed successfully!");
  console.log(`Created ${employees.length} employees across 2 entities and 7 locations.`);
  console.log(`Seeded April ${YEAR} attendance + payroll for ${mgbtEmployees.length} MGBT employees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
