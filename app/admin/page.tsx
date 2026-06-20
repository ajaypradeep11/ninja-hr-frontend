export const dynamic = "force-dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Cake,
  CalendarClock,
  GraduationCap,
  PartyPopper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ComplianceBadge,
  ProgressBar,
  Ring,
} from "@/components/ui";
import {
  currentUser,
  offboardingEmployee,
  payrollPeriod,
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
import { TimesheetButton } from "./timesheet-button";

const eventIcon = {
  probation: CalendarClock,
  anniversary: PartyPopper,
  policy: ShieldCheck,
  birthday: Cake,
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

  const maxSalary = Math.max(...salaryBenchmarks.flatMap((b) => [b.high]));
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
        {/* Onboarding Pipeline */}
        <Card className="card-pad lg:col-span-8">
          <CardHeader
            title="Onboarding Pipeline"
            action={
              <Link
                href="/admin/onboarding"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
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

        {/* Upcoming Events */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader title="Upcoming Events" />
          <div className="mt-4 space-y-4">
            {upcomingEvents.map((ev) => {
              const Icon = eventIcon[ev.kind];
              const d = new Date(ev.date + "T00:00:00");
              return (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-canvas">
                    <span className="text-[9px] font-bold uppercase text-ink-faint">
                      {d.toLocaleDateString("en-CA", { month: "short" })}
                    </span>
                    <span className="text-sm font-bold leading-none text-ink">
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{ev.title}</p>
                    <p className="truncate text-xs text-ink-muted">{ev.subtitle}</p>
                  </div>
                  <Icon className="h-4 w-4 text-ink-faint" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Salary Benchmarks */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Ontario Salary Benchmarks"
            action={<Sparkles className="h-4 w-4 text-brand-500" />}
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
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow"
                    style={{ left: `calc(${(b.current / maxSalary) * 100}% - 6px)` }}
                    title={`Current: ${formatCAD(b.current)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payroll Engine */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader title="Payroll Engine" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Next period: {payrollPeriod.label}
          </p>
          <div className="mt-1.5 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Est. biweekly salary
              </p>
              <p className="text-2xl font-bold text-ink">
                {formatCAD(payrollPeriod.estBiweekly, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                LTD contributions
              </p>
              <p className="text-sm font-semibold text-ink-soft">
                {formatCAD(payrollPeriod.ltdContributions)}
              </p>
            </div>
          </div>
          <TimesheetButton employees={employees} period={payrollPeriod.label} />
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-ink-muted">Completed Reviews</span>
            <span className="font-semibold text-ink">
              {payrollPeriod.completedReviews}/{payrollPeriod.totalReviews}
            </span>
          </div>
        </Card>

        {/* Active Training */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Active Training"
            action={
              <Link
                href="/admin/tracker"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {trainingCourses.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={c.progress} className="h-1" />
                    <span className="text-[11px] font-medium text-ink-muted">
                      {c.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Leave Requests */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="Leave Requests"
            action={
              <Link
                href="/admin/leave"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
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
                      <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Team Health */}
        <Card className="card-pad lg:col-span-3">
          <CardHeader title="Team Health" />
          <div className="flex flex-col items-center justify-center py-4">
            <Ring value={88} sublabel="Performance" />
            <p className="mt-3 text-center text-xs text-ink-muted">
              Overall performance across 45 active reviews
            </p>
          </div>
        </Card>

        {/* Offboarding */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Offboarding"
            action={
              <Link
                href="/admin/offboarding"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
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
