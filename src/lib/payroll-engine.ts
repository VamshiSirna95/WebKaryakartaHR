interface AttendanceInput {
  payableDays: number;
  workedDays: number;
  otDays: number;
  leaveEncashDays: number;
  labourHoliday: number;
}

interface EmployeeInput {
  salary: number;          // monthly CTC/salary
  ta: number;              // travel allowance (fixed amount)
  uanNumber: string | null;
  esiNumber: string | null;
}

export interface AdvanceInput {
  bankAdvance: number;
  cashAdvance: number;
  jifyAdvance: number;
  loanEmi: number;
  cashLoanEmi: number;
  uniformDeduction: number;
}

interface PayrollResult {
  // Salary structure
  basic: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  ta: number;
  lec: number;
  perDaySalary: number;
  // Earned
  earnedBasic: number;
  earnedHra: number;
  earnedSpecial: number;
  earnedOt: number;
  earnedLeave: number;
  earnedLabour: number;
  earnedTa: number;
  grossSalary: number;
  // Deductions
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  bankAdvance: number;
  cashAdvance: number;
  jifyAdvance: number;
  loanEmi: number;
  cashLoanEmi: number;
  uniformDeduction: number;
  totalDeductions: number;
  netSalary: number;
  // Employer cost
  gratuity: number;
  ctc: number;
}

const DEFAULT_ADVANCES: AdvanceInput = {
  bankAdvance: 0, cashAdvance: 0, jifyAdvance: 0,
  loanEmi: 0, cashLoanEmi: 0, uniformDeduction: 0,
};

export function computePayroll(
  emp: EmployeeInput,
  att: AttendanceInput,
  salaryArrears: number = 0,
  advances: AdvanceInput = DEFAULT_ADVANCES
): PayrollResult {
  // Step 1: Salary structure
  const basic = Math.round(emp.salary * 0.70);
  const hra = Math.round(emp.salary * 0.20);
  const specialAllowance = Math.round(emp.salary * 0.10);
  const bonus = Math.round(emp.salary / 12);
  const ta = emp.ta || 0;
  const lec = Math.round(emp.salary / 30 * 3);
  const perDaySalary = Math.ceil(emp.salary / 30);

  // Step 2: Earned components (prorated)
  const earnedBasic = Math.ceil(basic / 30 * att.payableDays);
  const earnedHra = Math.ceil(hra / 30 * att.payableDays);
  const earnedSpecial = Math.ceil(specialAllowance / 30 * att.payableDays);
  const earnedOt = Math.ceil(perDaySalary * att.otDays);
  const earnedLeave = Math.ceil(att.leaveEncashDays * perDaySalary);
  const earnedLabour = Math.ceil(att.labourHoliday * perDaySalary);
  const earnedTa = ta > 5000 ? ta : Math.ceil(ta / 30 * att.workedDays);

  const grossSalary = earnedBasic + earnedHra + earnedSpecial + earnedOt + earnedLeave + earnedLabour + earnedTa + salaryArrears;

  // Step 3: Statutory deductions
  // PF: 12% on min(earnedBasic, 15000) — only if UAN exists
  const pfApplicable = !!(emp.uanNumber && emp.uanNumber.length > 1);
  const pfBase = Math.min(earnedBasic, 15000);
  const pfEmployee = pfApplicable ? Math.round(pfBase * 0.12) : 0;
  const pfEmployer = pfEmployee; // mirrors

  // ESI: 0.75% employee, 3.25% employer — only if (salary + lec) <= 21000 AND UAN applicable
  const esiThreshold = emp.salary + lec;
  const esiApplicable = pfApplicable && esiThreshold <= 21000;
  const esiEmployee = esiApplicable ? Math.round(grossSalary * 0.0075) : 0;
  const esiEmployer = esiApplicable ? Math.round(grossSalary * 0.0325) : 0;

  // PT: Telangana slabs
  let professionalTax = 0;
  if (grossSalary >= 20001) professionalTax = 200;
  else if (grossSalary >= 15001) professionalTax = 150;

  // Total deductions (statutory + advances/loans)
  const totalDeductions = pfEmployee + esiEmployee + professionalTax +
    advances.bankAdvance + advances.cashAdvance + advances.jifyAdvance +
    advances.loanEmi + advances.cashLoanEmi + advances.uniformDeduction;

  const netSalary = grossSalary - totalDeductions;

  // Employer cost
  const gratuity = Math.round(basic / 26 * 1.25);
  const ctc = basic + hra + specialAllowance + bonus + ta + lec + pfEmployer + gratuity + esiEmployer;

  return {
    basic, hra, specialAllowance, bonus, ta, lec, perDaySalary,
    earnedBasic, earnedHra, earnedSpecial, earnedOt, earnedLeave, earnedLabour, earnedTa,
    grossSalary,
    pfEmployee, pfEmployer, esiEmployee, esiEmployer, professionalTax,
    bankAdvance: advances.bankAdvance,
    cashAdvance: advances.cashAdvance,
    jifyAdvance: advances.jifyAdvance,
    loanEmi: advances.loanEmi,
    cashLoanEmi: advances.cashLoanEmi,
    uniformDeduction: advances.uniformDeduction,
    totalDeductions, netSalary,
    gratuity, ctc,
  };
}
