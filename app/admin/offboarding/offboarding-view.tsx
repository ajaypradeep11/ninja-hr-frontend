"use client";

import * as React from "react";
import {
  LogOut,
  Lock,
  ShieldAlert,
  Power,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Bell,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Avatar,
  PageHeader,
} from "@/components/ui";
import { offboardingEmployee } from "@/lib/data";
import type { OffboardingTask } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";
import {
  setOffboardingTaskStatus,
  finalizeTermination,
} from "@/app/actions/modules";

type Status = "Pending" | "In-Progress" | "Completed";
type Owner = "Manager" | "IT / Ops" | "HR / Payroll";

const TEMPLATES = [
  "Software Engineer Offboarding",
  "Sales Team Offboarding",
  "Executive Departure",
];

const COLUMNS: { owner: Owner; tone: string }[] = [
  { owner: "Manager", tone: "text-sky-600" },
  { owner: "IT / Ops", tone: "text-violet-600" },
  { owner: "HR / Payroll", tone: "text-emerald-600" },
];

const statusMeta: Record<Status, { tone: "gray" | "amber" | "green"; icon: typeof Clock }> = {
  Pending: { tone: "gray", icon: Clock },
  "In-Progress": { tone: "amber", icon: Loader2 },
  Completed: { tone: "green", icon: CheckCircle2 },
};

const NEXT: Record<Status, Status> = {
  Pending: "In-Progress",
  "In-Progress": "Completed",
  Completed: "Pending",
};

export function OffboardingView({ initialTasks }: { initialTasks: OffboardingTask[] }) {
  const [template, setTemplate] = React.useState(TEMPLATES[1]);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [override, setOverride] = React.useState(false);
  const [terminated, setTerminated] = React.useState(false);

  const blockers = tasks.filter((t) => t.blocking && t.status !== "Completed");
  const canFinalize = blockers.length === 0 || override;

  async function cycle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = NEXT[task.status as Status];
    setTasks(await setOffboardingTaskStatus(id, nextStatus));
  }

  return (
    <div>
      <PageHeader
        title="Offboarding"
        subtitle="Role-based separation workflows with IT/Admin termination automation and asset-clearance guardrails."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Template
            </span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-ink outline-none"
            >
              {TEMPLATES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Employee header */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={offboardingEmployee.name} size={44} />
            <div>
              <p className="text-base font-bold text-ink">{offboardingEmployee.name}</p>
              <p className="text-xs text-ink-muted">
                {offboardingEmployee.title} · Last day{" "}
                {formatDate(offboardingEmployee.lastDay)}
              </p>
            </div>
          </div>
          <Badge tone={terminated ? "red" : "amber"}>
            {terminated ? "Terminated" : "Offboarding In Progress"}
          </Badge>
        </div>
      </Card>

      {/* Task matrix */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.owner === col.owner);
          return (
            <Card key={col.owner} className="card-pad">
              <h3 className={cn("text-sm font-bold", col.tone)}>{col.owner}</h3>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {colTasks.filter((t) => t.status === "Completed").length}/{colTasks.length} done
              </p>
              <div className="mt-3 space-y-2.5">
                {colTasks.map((t) => {
                  const meta = statusMeta[t.status as Status];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => cycle(t.id)}
                      className="flex w-full items-start gap-2.5 rounded-xl border border-line p-3 text-left transition-colors hover:border-brand-300"
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          t.status === "Completed"
                            ? "text-emerald-500"
                            : t.status === "In-Progress"
                              ? "text-amber-500"
                              : "text-ink-faint",
                        )}
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-ink">{t.label}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <Badge tone={meta.tone}>{t.status}</Badge>
                          {t.blocking && (
                            <Badge tone="red">
                              <Lock className="h-2.5 w-2.5" /> Blocking
                            </Badge>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Guardrail cards */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Power className="h-4 w-4 text-brand-500" /> Access kill switch
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            On <b>Terminated</b>, fires <code className="rounded bg-canvas px-1">employee.status.terminated</code>,
            invalidates session tokens and suspends Google Workspace, Microsoft 365 & Slack.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bell className="h-4 w-4 text-brand-500" /> Manager handoff reminders
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Within 48 hours of the last day, uncompleted manager tasks trigger daily
            escalation alerts to the manager&apos;s dashboard and channels.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldAlert className="h-4 w-4 text-brand-500" /> Blocking task gate
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Tasks like <b>Recover Laptop</b> and <b>Sign Separation Release</b> are flagged{" "}
            <code className="rounded bg-canvas px-1">is_blocking_termination</code> and stop
            finalization until cleared.
          </p>
        </Card>
      </div>

      {/* Finalize panel */}
      <Card className="card-pad mt-5 border-red-200 bg-red-50/30">
        <CardHeader title="System Termination Trigger" />
        {blockers.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Cannot terminate employee in system. Critical blocking tasks are outstanding:{" "}
              {blockers.map((b) => `[${b.owner}] ${b.label}`).join(", ")}.
            </span>
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand-500"
          />
          <b>Super Admin override</b> — force termination and log the bypass reason to the
          immutable audit trail.
        </label>
        <button
          disabled={!canFinalize || terminated}
          onClick={async () => {
            await finalizeTermination(offboardingEmployee.name);
            setTerminated(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {terminated ? "Employee Terminated" : "Finalize System Termination"}
        </button>
        {terminated && (
          <p className="mt-2 text-xs text-red-600">
            Access revoked across all integrations. ROE schedule and final-pay countdown
            started.
          </p>
        )}
      </Card>
    </div>
  );
}
