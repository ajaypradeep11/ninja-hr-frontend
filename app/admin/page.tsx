export const dynamic = "force-dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Cake,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ArcGauge,
  Avatar,
  Badge,
  Card,
  CardHeader,
  ComplianceBadge,
  ProgressBar,
  VividStat,
} from "@/components/ui";
import {
  currentUser,
  offboardingEmployee,
  upcomingEvents,
} from "@/lib/data";
import {
  getSalaryBenchmarks,
  getLeaveRequests,
  getTrainingCourses,
  getOffboardingTasks,
  getOnboardingPipeline,
  getEmployees,
} from "@/lib/queries";
import { formatCAD, formatDate } from "@/lib/utils";

const eventIcon = {
  probation: CalendarClock,
  anniversary: PartyPopper,
  policy: ShieldCheck,
  birthday: Cake,
};

// Colored agenda rail per event kind — same fills as the vivid tiles.
const eventRail = {
  probation: "bg-blue-600",
  anniversary: "bg-pink-600",
  policy: "bg-emerald-700",
  birthday: "bg-orange-700",
};

export default async function AdminDashboard() {
  const [salaryBenchmarks, leaveRequests, trainingCourses, offboardingTasks, onboardingPipeline, employees] =
    await Promise.all([
      getSalaryBenchmarks(),
      getLeaveRequests(),
      getTrainingCourses(),
      getOffboardingTasks(),
      getOnboardingPipeline(),
      getEmployees(),
    ]);

  // Guard the empty case — Math.max() of nothing is -Infinity, which breaks bar widths.
  const maxSalary = salaryBenchmarks.length ? Math.max(...salaryBenchmarks.map((b) => b.high)) : 1;
  const pendingLeave = leaveRequests.filter((l) => l.status === "Pending");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Good morning, {currentUser.firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Here&apos;s what&apos;s happening across your workforce today.
          </p>
        </div>
        <ComplianceBadge />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Vivid bento tiles */}
        <div className="grid grid-cols-2 gap-5 lg:col-span-12 lg:grid-cols-4">
          <VividStat
            tone="blue"
            label="Employees"
            value={employees.length}
            hint="Across all departments"
            icon={<Users className="h-4 w-4" />}
          />
          <VividStat
            tone="pink"
            label="Hires onboarding"
            value={onboardingPipeline.length}
            hint="In the pipeline right now"
            icon={<UserPlus className="h-4 w-4" />}
          />
          <VividStat
            tone="orange"
            label="Leave requests"
            value={pendingLeave.length}
            hint="Awaiting your review"
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <VividStat
            tone="green"
            label="Training courses"
            value={trainingCourses.length}
            hint="Active across the company"
            icon={<GraduationCap className="h-4 w-4" />}
          />
        </div>

        {/* Onboarding Pipeline */}
        <Card className="card-pad lg:col-span-8">
          <CardHeader
            title="Onboarding Pipeline"
            action={
              <Link
                href="/admin/onboarding"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                View all hires
              </Link>
            }
          />
          <div className="mt-4 space-y-4">
            {onboardingPipeline.map((hire) => (
              <div key={hire.id} className="flex items-center gap-4">
                <Avatar name={hire.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{hire.name}</p>
                  <p className="truncate text-xs text-ink-muted">{hire.title}</p>
                </div>
                <div className="hidden w-48 items-center gap-3 sm:flex">
                  <ProgressBar value={hire.progress} />
                  <span className="w-9 text-right text-xs font-semibold text-ink-soft">
                    {hire.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Team Health */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader title="Team Health" />
          <div className="flex flex-col items-center justify-center py-3">
            <ArcGauge value={88} sublabel="Performance" />
            <p className="mt-1 text-center text-xs text-ink-muted">
              Overall performance across 45 active reviews
            </p>
          </div>
        </Card>

        {/* Leave Requests */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="Leave Requests"
            action={
              <Link
                href="/admin/leave"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Open queue
              </Link>
            }
          />
          <div className="mt-2 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Employee</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Dates</th>
                  <th className="pb-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeave.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={l.employee} size={28} />
                        <span className="font-medium text-ink">{l.employee}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-ink-muted">{l.type}</td>
                    <td className="py-2.5 text-ink-muted">
                      {formatDate(l.start, { year: undefined })} –{" "}
                      {formatDate(l.end, { year: undefined })}
                    </td>
                    <td className="py-2.5 text-right">
                      {/* Approval happens on the Leave page — a bare button here did nothing. */}
                      <Link
                        href="/admin/leave"
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Salary Benchmarks */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Ontario Salary Benchmarks"
            action={<Sparkles className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
          />
          <p className="mt-1 text-xs text-ink-muted">Live market ranges</p>
          <div className="mt-5 space-y-4">
            {salaryBenchmarks.map((b) => (
              <div key={b.role}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-soft">{b.role}</span>
                  <span className="text-ink-faint">
                    {formatCAD(b.low, { maximumFractionDigits: 0 })} –{" "}
                    {formatCAD(b.high, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-line">
                  <div
                    className="absolute h-full rounded-full bg-brand-400/40"
                    style={{
                      left: `${(b.low / maxSalary) * 100}%`,
                      width: `${((b.high - b.low) / maxSalary) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-card bg-brand-600 shadow"
                    style={{ left: `calc(${(b.current / maxSalary) * 100}% - 6px)` }}
                    title={`Current: ${formatCAD(b.current)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Copilot promo */}
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-500 p-5 text-white shadow-card lg:col-span-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> NinjaHR Copilot
            </span>
            <p className="mt-4 text-lg font-bold leading-snug">
              Ask anything about your workforce
            </p>
            <p className="mt-1.5 text-xs text-white/80">
              Policies, people, pipelines — your agents have the answer.
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-white/90"
          >
            Meet your agents <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Active Training */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Company Training"
            action={
              <Link
                href="/admin/training"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Manage
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {trainingCourses.length === 0 && (
              <p className="text-sm text-ink-muted">No courses yet — create one in Training.</p>
            )}
            {trainingCourses.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {c.category} · {c.assignedCount ?? 0} assigned · {c.completedCount ?? 0} completed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Events — agenda list with a colored date rail */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader title="Upcoming Events" />
          <div className="mt-4 space-y-4">
            {upcomingEvents.map((ev) => {
              const Icon = eventIcon[ev.kind];
              const d = new Date(ev.date + "T00:00:00");
              return (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-10 shrink-0 text-right">
                    <p className="text-[10px] font-bold uppercase text-ink-faint">
                      {d.toLocaleDateString("en-CA", { month: "short" })}
                    </p>
                    <p className="text-sm font-bold leading-none text-ink">{d.getDate()}</p>
                  </div>
                  <span className={`h-9 w-1 shrink-0 rounded-full ${eventRail[ev.kind]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{ev.title}</p>
                    <p className="truncate text-xs text-ink-muted">{ev.subtitle}</p>
                  </div>
                  <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Offboarding */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Offboarding"
            action={
              <Link
                href="/admin/offboarding"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Manage <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={offboardingEmployee.name} size={36} />
            <div>
              <p className="text-sm font-semibold text-ink">{offboardingEmployee.name}</p>
              <p className="text-xs text-ink-muted">
                Last day {formatDate(offboardingEmployee.lastDay, { year: undefined })}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {offboardingTasks.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t.label}</span>
                <Badge tone={t.status === "Completed" ? "green" : t.status === "In-Progress" ? "amber" : "gray"}>
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
