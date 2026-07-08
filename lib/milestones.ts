// Milestone Tracker — pure date computations over live HRIS + review data.
// Everything is derived; nothing is stored.

import type { Employee } from "@/lib/data";

export type MilestoneCategory = "Compliance" | "Tenure" | "Performance" | "Pay";

export interface MilestoneAction {
  label: string;
  href: string;
}

export interface Milestone {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  daysUntil: number;
  title: string;
  sub: string;
  category: MilestoneCategory;
  actions?: MilestoneAction[];
}

export interface ReviewLike {
  id: string;
  employee: string;
  cycle: string;
  state: string;
  due: string;
}

/** How far ahead the tracker looks. */
export const HORIZON_DAYS = 180;

const DAY = 86_400_000;

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function today(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** Parse an ISO date string at local midnight (avoids UTC off-by-one). */
function at(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Next anniversary of a month/day after (or on) today. */
function nextOccurrence(monthDay: Date, from: Date): Date {
  const next = new Date(from.getFullYear(), monthDay.getMonth(), monthDay.getDate());
  if (next.getTime() < from.getTime()) next.setFullYear(next.getFullYear() + 1);
  return next;
}

/** Company payday: biweekly Fridays anchored to 2026-01-09. */
export function nextPayday(from = today()): Date {
  const anchor = new Date(2026, 0, 9);
  const elapsed = Math.floor(daysBetween(anchor, from) / 14);
  let next = new Date(anchor.getTime() + (elapsed * 14) * DAY);
  while (next.getTime() < from.getTime()) next = new Date(next.getTime() + 14 * DAY);
  return next;
}

const ordinal = (n: number) => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/**
 * All upcoming milestones for one employee within the horizon.
 * `forTeamView` attaches manager quick-actions to actionable entries.
 */
export function employeeMilestones(
  emp: Employee,
  reviews: ReviewLike[],
  opts: { forTeamView?: boolean; includePayday?: boolean } = {},
): Milestone[] {
  const now = today();
  const out: Milestone[] = [];
  const hire = at(emp.hireDate);

  // Compliance: 90-day probation end (kept visible for a week after passing).
  const probationEnd = new Date(hire.getTime() + 90 * DAY);
  const probationDays = daysBetween(now, probationEnd);
  if (probationDays >= -7 && probationDays <= HORIZON_DAYS) {
    out.push({
      id: `prob-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: iso(probationEnd),
      daysUntil: probationDays,
      title: "90-Day Probation Ends",
      sub:
        probationDays >= 0
          ? `in ${probationDays} day${probationDays === 1 ? "" : "s"}`
          : `${-probationDays} day${probationDays === -1 ? "" : "s"} ago — close it out`,
      category: "Compliance",
      actions: opts.forTeamView
        ? [
            { label: "Start Review", href: "/admin/performance" },
            { label: "Draft Pass/Fail Letter", href: "/admin/letter-lab" },
          ]
        : undefined,
    });
  }

  // Tenure: next work anniversary (only once they've been here ≥ 1 year mark).
  const anniversary = nextOccurrence(hire, now);
  const years = anniversary.getFullYear() - hire.getFullYear();
  const annDays = daysBetween(now, anniversary);
  if (years >= 1 && annDays <= HORIZON_DAYS) {
    out.push({
      id: `ann-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: iso(anniversary),
      daysUntil: annDays,
      title: `${ordinal(years)} Work Anniversary`,
      sub: `${years} year${years === 1 ? "" : "s"} at the company`,
      category: "Tenure",
      actions: opts.forTeamView
        ? [{ label: "Send kudos", href: "/employee/performance" }]
        : undefined,
    });
  }

  // Tenure: birthday (year-agnostic). Skipped entirely when the employee keeps
  // it private — the API also blanks birthDate for non-HR viewers, and the
  // flag check keeps it off calendars even for HR (compliance views show the
  // DOB in the HRIS record instead).
  if (!emp.birthdayPrivate && emp.birthDate) {
    const bday = nextOccurrence(at(emp.birthDate), now);
    const bdayDays = daysBetween(now, bday);
    if (bdayDays <= HORIZON_DAYS) {
      out.push({
        id: `bday-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date: iso(bday),
        daysUntil: bdayDays,
        title: "Birthday",
        sub: emp.name.split(" ")[0] + "'s birthday",
        category: "Tenure",
      });
    }
  }

  // Performance: open review cycles due.
  for (const r of reviews.filter((r) => r.employee === emp.name && r.state !== "Completed")) {
    const due = at(r.due);
    const dueDays = daysBetween(now, due);
    if (dueDays >= -14 && dueDays <= HORIZON_DAYS) {
      out.push({
        id: `rev-${r.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date: iso(due),
        daysUntil: dueDays,
        title: `${r.cycle} Review Due`,
        sub: `Currently: ${r.state}`,
        category: "Performance",
        actions: opts.forTeamView
          ? [{ label: "Open Reviews", href: "/admin/performance" }]
          : undefined,
      });
    }
  }

  // Pay: next payday (personal view only — identical for everyone).
  if (opts.includePayday) {
    const payday = nextPayday(now);
    out.push({
      id: `pay-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: iso(payday),
      daysUntil: daysBetween(now, payday),
      title: "Next Payday",
      sub: "Bi-weekly deposit",
      category: "Pay",
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Active-ish direct reports (everyone not already out the door). */
export function directReports(employees: Employee[], managerName: string): Employee[] {
  return employees.filter(
    (e) =>
      e.manager === managerName && e.status !== "Terminated" && e.status !== "Offboarding",
  );
}

export function teamMilestones(reports: Employee[], reviews: ReviewLike[]): Milestone[] {
  return reports
    .flatMap((e) => employeeMilestones(e, reviews, { forTeamView: true }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Reports whose probation ends within `windowDays` — drives the AI nudge. */
export function probationNudges(reports: Employee[], windowDays = 14): Milestone[] {
  return teamMilestones(reports, []).filter(
    (m) => m.category === "Compliance" && m.daysUntil >= 0 && m.daysUntil <= windowDays,
  );
}
