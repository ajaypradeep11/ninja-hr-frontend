// Custom Calculator Engine types + the pure evaluation logic used by the
// Run Payroll/Timesheet view.

export type CalcCategory = "Timesheet" | "Accrual" | "Bonus";
export type CalcOperator = ">" | ">=" | "<" | "<=" | "=";

export interface CalcRule {
  id: string;
  category: CalcCategory;
  field: string;
  operator: CalcOperator;
  threshold: number;
  action: string;
  value: number;
  active: boolean;
}

export interface CalcRuleInput {
  category: CalcCategory;
  field: string;
  operator: CalcOperator;
  threshold: number;
  action: string;
  value: number;
  active?: boolean;
}

export const CALC_FIELDS = ["Total Weekly Hours", "Hours Worked", "Base Rate"] as const;
export const CALC_OPERATORS: { v: CalcOperator; label: string }[] = [
  { v: ">", label: "is greater than" },
  { v: ">=", label: "is at least" },
  { v: "<", label: "is less than" },
  { v: "<=", label: "is at most" },
  { v: "=", label: "equals" },
];
export const CALC_ACTIONS = [
  "Multiply Base Rate",
  "Add Flat Bonus $",
  "Accrue Vacation %",
  "Add Hours",
] as const;

export const CATEGORY_TABS: { key: CalcCategory; label: string }[] = [
  { key: "Timesheet", label: "Timesheets / Payroll" },
  { key: "Accrual", label: "Leave Accruals" },
  { key: "Bonus", label: "Custom Bonuses" },
];

function matches(rule: CalcRule, fieldValue: number): boolean {
  switch (rule.operator) {
    case ">":
      return fieldValue > rule.threshold;
    case ">=":
      return fieldValue >= rule.threshold;
    case "<":
      return fieldValue < rule.threshold;
    case "<=":
      return fieldValue <= rule.threshold;
    case "=":
      return fieldValue === rule.threshold;
  }
}

export interface TimesheetRow {
  employeeId: string;
  name: string;
  department: string;
  hourlyRate: number;
  weeklyHours: number;
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  basePay: number;
  overtimePay: number;
  bonus: number;
  vacationAccrualPct: number;
  vacationAccrued: number;
  total: number;
  appliedRules: string[];
}

/** Deterministic pseudo-random weekly hours (36–52) so demo runs are stable. */
export function demoWeeklyHours(employeeId: string): number {
  let h = 0;
  for (let i = 0; i < employeeId.length; i++) h = (h * 31 + employeeId.charCodeAt(i)) >>> 0;
  return 36 + (h % 17);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply the active rules to one employee-week. The rule field is read off the
 * week (`Total Weekly Hours` / `Hours Worked` → hours, `Base Rate` → rate).
 */
export function calculateRow(
  emp: { id: string; name: string; department: string; salary: number },
  weeklyHours: number,
  rules: CalcRule[],
): TimesheetRow {
  const hourlyRate = r2(emp.salary / 2080); // 40h × 52w
  const fieldValue = (field: string) => (field === "Base Rate" ? hourlyRate : weeklyHours);

  const active = rules.filter((r) => r.active);
  const applied: string[] = [];

  // Timesheet: overtime threshold + multiplier from the first matching rule.
  let otThreshold = Infinity;
  let otMultiplier = 1;
  for (const r of active.filter((r) => r.category === "Timesheet")) {
    if (r.action === "Multiply Base Rate" && matches(r, fieldValue(r.field))) {
      otThreshold = Math.min(otThreshold, r.threshold);
      otMultiplier = Math.max(otMultiplier, r.value);
      applied.push(`OT ×${r.value} after ${r.threshold}h`);
    }
  }
  const overtimeHours = otThreshold === Infinity ? 0 : Math.max(0, weeklyHours - otThreshold);
  const regularHours = weeklyHours - overtimeHours;

  // Bonuses: flat dollar adds.
  let bonus = 0;
  for (const r of active.filter((r) => r.category === "Bonus")) {
    if (r.action === "Add Flat Bonus $" && matches(r, fieldValue(r.field))) {
      bonus += r.value;
      applied.push(`Bonus $${r.value}`);
    }
  }

  // Accruals: vacation % of gross hours-pay.
  let vacationAccrualPct = 0;
  for (const r of active.filter((r) => r.category === "Accrual")) {
    if (r.action === "Accrue Vacation %" && matches(r, fieldValue(r.field))) {
      vacationAccrualPct += r.value;
      applied.push(`Vacation ${r.value}%`);
    }
  }

  const basePay = r2(regularHours * hourlyRate);
  const overtimePay = r2(overtimeHours * hourlyRate * otMultiplier);
  const vacationAccrued = r2(((basePay + overtimePay) * vacationAccrualPct) / 100);
  const total = r2(basePay + overtimePay + bonus);

  return {
    employeeId: emp.id,
    name: emp.name,
    department: emp.department,
    hourlyRate,
    weeklyHours,
    regularHours,
    overtimeHours,
    overtimeMultiplier: otMultiplier,
    basePay,
    overtimePay,
    bonus,
    vacationAccrualPct,
    vacationAccrued,
    total,
    appliedRules: applied,
  };
}
