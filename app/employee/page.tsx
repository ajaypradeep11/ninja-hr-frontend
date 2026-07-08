export const dynamic = "force-dynamic";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  GraduationCap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  LinkButton,
  ProgressBar,
} from "@/components/ui";
import { getActor } from "@/lib/actor";
import { getMyLeaveBalances } from "@/app/actions/modules";
import { getMyTraining } from "@/app/actions/training";
import { getEmployees, getPerformanceReviews } from "@/lib/queries";
import {
  directReports,
  employeeMilestones,
  probationNudges,
  teamMilestones,
} from "@/lib/milestones";
import { cn, formatDate } from "@/lib/utils";
import { CopilotQuickAsk } from "@/components/copilot-quick-ask";
import { UpcomingMilestones } from "@/components/upcoming-milestones";
import { MilestoneNudge } from "@/components/milestone-nudge";

const balanceTone: Record<string, { bg: string; bar: "brand" | "sky" | "amber"; text: string }> = {
  brand: { bg: "bg-brand-50", bar: "brand", text: "text-brand-700 dark:text-brand-400" },
  sky: { bg: "bg-sky-50 dark:bg-sky-500/10", bar: "sky", text: "text-sky-700 dark:text-sky-300" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", bar: "amber", text: "text-amber-700 dark:text-amber-300" },
};

const myTasks = [
  { id: "tk1", label: "Complete WHMIS 2015 training", done: false, due: "2026-06-30" },
  { id: "tk2", label: "Acknowledge updated Employee Handbook", done: false, due: "2026-06-22" },
  { id: "tk3", label: "Submit updated direct deposit info", done: true, due: "2026-06-01" },
  { id: "tk4", label: "Review Q2 goals with manager", done: false, due: "2026-07-05" },
];

export default async function EmployeeDashboard() {
  // Live data: balances derive from the actor's actual approved requests, so
  // this card, the Leave page and the assistant all quote the same numbers.
  const [actor, myTraining, leaveBalances, employees, reviews] = await Promise.all([
    getActor(),
    getMyTraining(),
    getMyLeaveBalances(),
    getEmployees(),
    getPerformanceReviews().catch(() => []),
  ]);
  const active = myTraining.filter((a) => a.status !== "Completed");

  // Milestones — all derived from live HRIS + review data.
  const me = employees.find((e) => e.id === actor.employeeId);
  const myMilestones = me ? employeeMilestones(me, reviews, { includePayday: true }) : [];
  const reports = directReports(employees, actor.name);
  const team = teamMilestones(reports, reviews);
  const nudges = probationNudges(reports);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">
          Welcome back, {actor.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Here&apos;s your day at a glance — tasks, time off, and growth.
        </p>
      </div>

      {/* AI nudges — reports whose probation window is closing (managers only). */}
      <MilestoneNudge nudges={nudges} />

      {/* Leave balances */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {leaveBalances.map((b) => {
          const t = balanceTone[b.tone];
          const total = b.available + b.used;
          return (
            <Card key={b.type} className="card-pad">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    t.bg,
                    t.text,
                  )}
                >
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-ink-faint">
                  {b.used} used of {total}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-ink">
                {b.available} <span className="text-sm font-medium text-ink-muted">{b.unit}</span>
              </p>
              <p className="text-xs text-ink-muted">{b.type}</p>
              <ProgressBar
                value={(b.available / total) * 100}
                tone={t.bar}
                className="mt-3"
              />
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* My Tasks */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="My Tasks"
            action={
              <span className="text-xs font-semibold text-ink-muted">
                {myTasks.filter((t) => !t.done).length} open
              </span>
            }
          />
          <div className="mt-4 space-y-1">
            {myTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-canvas"
              >
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-ink-faint" />
                )}
                <span
                  className={cn(
                    "flex-1 text-sm",
                    t.done ? "text-ink-faint line-through" : "text-ink-soft",
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[11px] text-ink-faint">
                  {formatDate(t.due, { year: undefined })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming — live milestones, tabbed for managers */}
        <div className="lg:col-span-4">
          <UpcomingMilestones mine={myMilestones} team={team} />
        </div>

        {/* Ask AI — one-line entry to the single global Co-Pilot panel. */}
        <Card className="card-pad lg:col-span-3 flex flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div>
            <h3 className="text-base font-bold">HR Co-Pilot</h3>
            <p className="mt-1 text-sm text-white/80">
              &ldquo;How many vacation days do I have left?&rdquo; — press Enter and the
              assistant panel opens with your answer.
            </p>
          </div>
          <div className="mt-4">
            <CopilotQuickAsk />
          </div>
        </Card>

        {/* My Training */}
        <Card className="card-pad lg:col-span-12">
          <CardHeader
            title="My Training"
            action={
              <LinkButton href="/employee/training" variant="ghost" size="sm">
                View all
              </LinkButton>
            }
          />
          {active.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">You&apos;re all caught up on training. 🎉</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{a.courseTitle}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={a.progress} className="h-1" />
                      <span className="text-[11px] font-medium text-ink-muted">{a.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
