// Upcoming company events, DERIVED from live HRIS + review data (replaces the
// old hardcoded lib/data stub). Wraps lib/milestones so the dashboard and the
// Lifecycle Tracker agree with the Tracker's own probation/anniversary math.

import type { Employee, UpcomingEvent } from "@/lib/data";
import { employeeMilestones, type Milestone, type ReviewLike } from "@/lib/milestones";

function kindOf(m: Milestone): UpcomingEvent["kind"] {
  if (m.category === "Compliance") return "probation";
  if (m.category === "Performance") return "policy";
  return m.title === "Birthday" ? "birthday" : "anniversary";
}

/**
 * The next `limit` company-wide events: probation ends, work anniversaries,
 * birthdays (unless kept private) and open review due dates.
 */
export function deriveUpcomingEvents(
  employees: Employee[],
  reviews: ReviewLike[] = [],
  limit = 5,
): UpcomingEvent[] {
  return employees
    .filter((e) => e.status !== "Terminated" && e.status !== "Offboarding")
    .flatMap((e) => employeeMilestones(e, reviews))
    .filter((m) => m.daysUntil >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      date: m.date,
      title: m.title,
      subtitle:
        m.title === "Birthday" ? m.employeeName : `${m.employeeName} · ${m.sub}`,
      kind: kindOf(m),
    }));
}
