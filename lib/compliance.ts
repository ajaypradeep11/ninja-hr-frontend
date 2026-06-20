/**
 * Canadian provincial compliance engine (prototype).
 * Encodes the ESA / Bill 149 / Law 25 rules described in the product spec.
 * These are simplified, illustrative thresholds — not legal advice.
 */

export type ProvinceCode =
  | "ON"
  | "BC"
  | "AB"
  | "QC"
  | "SK"
  | "MB"
  | "NS"
  | "NB";

export interface Province {
  code: ProvinceCode;
  name: string;
}

export const PROVINCES: Province[] = [
  { code: "ON", name: "Ontario" },
  { code: "BC", name: "British Columbia" },
  { code: "AB", name: "Alberta" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "MB", name: "Manitoba" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NB", name: "New Brunswick" },
];

export function provinceName(code: ProvinceCode) {
  return PROVINCES.find((p) => p.code === code)?.name ?? code;
}

/** Rule B: Vacation accrual minimum (% of gross wages) by province + tenure. */
export function vacationAccrualRate(code: ProvinceCode, yearsOfService: number) {
  if (code === "SK") {
    return yearsOfService >= 10 ? 0.08 : 0.06; // 4wk / 3wk
  }
  return yearsOfService >= 5 ? 0.06 : 0.04; // 3wk / 2wk
}

export function accrualWeeks(rate: number) {
  return Math.round(rate / 0.02); // 2% ≈ 1 week
}

/** Rule A: Statutory paid sick-day minimums by province. */
export function statutoryPaidSickDays(code: ProvinceCode) {
  if (code === "BC") return 5;
  return 0; // ON and most others mandate unpaid statutory sick days
}

/**
 * Validate a configured paid-sick-day policy against the provincial floor.
 * Returns an error string when the policy is non-compliant, else null.
 */
export function validateSickPolicy(code: ProvinceCode, configuredPaidDays: number) {
  const floor = statutoryPaidSickDays(code);
  if (configuredPaidDays < floor) {
    return `Error: ${
      code === "BC" ? "BC" : provinceName(code)
    } Employment Standards mandate a minimum of ${floor} paid sick days after 90 days of employment.`;
  }
  return null;
}

export interface JdComplianceIssue {
  level: "error" | "warning" | "info";
  message: string;
}

/** Bill 149 / Law 25 job-description validation. */
export function validateJobDescription(input: {
  province: ProvinceCode;
  salaryMin?: number;
  salaryMax?: number;
  body: string;
}): JdComplianceIssue[] {
  const issues: JdComplianceIssue[] = [];
  const { province, salaryMin, salaryMax, body } = input;

  if (province === "ON") {
    if (!salaryMin || !salaryMax) {
      issues.push({
        level: "error",
        message: "Ontario Bill 149 requires a salary range. Please add one.",
      });
    } else if (salaryMax - salaryMin > 50_000) {
      issues.push({
        level: "error",
        message:
          "Ontario Bill 149 caps the posted salary spread at $50,000. Narrow the range.",
      });
    }
    if (/canadian experience/i.test(body)) {
      issues.push({
        level: "warning",
        message:
          "Remove the 'Canadian experience' requirement to comply with Ontario regulations.",
      });
    }
    issues.push({
      level: "info",
      message:
        "AI disclosure footer will be auto-appended: “Artificial Intelligence is utilized in the screening process for this role.”",
    });
  }

  if (province === "QC") {
    issues.push({
      level: "info",
      message:
        "Law 25 privacy-consent links regarding candidate data retention will be auto-appended.",
    });
  }

  return issues;
}

/** Probation review milestone — flags employees nearing the 90-day window. */
export function probationStatus(hireDateIso: string, todayIso: string) {
  const hire = new Date(hireDateIso + "T00:00:00").getTime();
  const today = new Date(todayIso + "T00:00:00").getTime();
  const days = Math.round((today - hire) / 86_400_000);
  const daysToMilestone = 90 - days;
  return { daysEmployed: days, daysToMilestone, due: days >= 60 && days <= 90 };
}
