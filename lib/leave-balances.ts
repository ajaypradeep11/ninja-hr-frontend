// lib/leave-balances.ts
// Live leave balances — "used" is DERIVED from the same approved requests the
// "My Requests" table shows, so the balance cards can never drift from the
// history below them. Only the annual entitlements are configuration.
import type { LeaveBalance, LeaveRequest } from "@/lib/data";

/** Annual entitlements (days). Statutory leaves (Parental/Bereavement) are
 *  job-protected and untracked here, so they have no card. */
const ENTITLEMENTS: {
  card: string;
  leaveType: LeaveRequest["type"];
  totalDays: number;
  tone: LeaveBalance["tone"];
}[] = [
  { card: "Vacation Days Available", leaveType: "Vacation", totalDays: 18, tone: "brand" },
  { card: "Sick Leave Remaining", leaveType: "Sick Leave", totalDays: 5, tone: "sky" },
  { card: "Paid / Unpaid Personal", leaveType: "Personal", totalDays: 4, tone: "amber" },
];

const HOURS_PER_DAY = 8;

/** Round to 1 decimal so partial-day (hours) usage reads cleanly (e.g. 2.5). */
const r1 = (n: number) => Math.round(n * 10) / 10;

export function computeLeaveBalances(
  requests: LeaveRequest[],
  employeeName: string,
  year = new Date().getFullYear(),
): LeaveBalance[] {
  const mineApproved = requests.filter(
    (req) =>
      req.employee === employeeName &&
      req.status === "Approved" &&
      req.start.startsWith(String(year)),
  );

  return ENTITLEMENTS.map((e) => {
    const used = r1(
      mineApproved
        .filter((req) => req.type === e.leaveType)
        .reduce((sum, req) => sum + (req.hours ? req.hours / HOURS_PER_DAY : req.days), 0),
    );
    return {
      type: e.card,
      used,
      available: r1(Math.max(0, e.totalDays - used)),
      unit: "days" as const,
      tone: e.tone,
    };
  });
}
