"use client";

import * as React from "react";
import {
  LogOut,
  ShieldAlert,
  Power,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Bell,
  Save,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Avatar,
  PageHeader,
} from "@/components/ui";
import { AssigneePicker } from "@/components/assignee-picker";
import { TaskStatusPill, BlockingTag } from "@/components/task-pills";
import { ToolLauncher } from "@/components/tools/tool-launcher";
import { offboardingEmployee } from "@/lib/data";
import type { OffboardingTask } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";
import {
  setOffboardingTaskStatus,
  setOffboardingAssignee,
  finalizeTermination,
  saveOffboarding,
} from "@/app/actions/modules";
import { listEmployeeDirectory } from "@/app/actions/onboarding";

type Status = "Pending" | "In-Progress" | "Completed";
type Owner = "Manager" | "IT / Ops" | "HR / Payroll";
type TerminationType = "Voluntary" | "Involuntary";

/** ESA-informed reason lists, keyed by the voluntary/involuntary split. */
const TERMINATION_REASONS: Record<TerminationType, string[]> = {
  Voluntary: [
    "Resignation",
    "Retirement",
    "End of contract",
    "Mutual agreement",
    "Other",
  ],
  Involuntary: [
    "Performance",
    "Misconduct",
    "Restructuring / position eliminated",
    "Probationary release",
    "Frustration of contract",
    "Other",
  ],
};

const TEMPLATES = [
  "Software Engineer Offboarding",
  "Sales Team Offboarding",
  "Executive Departure",
];

const COLUMNS: { owner: Owner; tone: string }[] = [
  { owner: "Manager", tone: "text-sky-600 dark:text-sky-300" },
  { owner: "IT / Ops", tone: "text-violet-600 dark:text-violet-300" },
  { owner: "HR / Payroll", tone: "text-emerald-600 dark:text-emerald-300" },
];

/** Which company department typically heads each offboarding track — used to
 *  suggest the best-fit owner first in the delegation picker. */
const OWNER_HOME_DEPT: Record<Owner, string | null> = {
  Manager: null,
  "IT / Ops": "Engineering",
  "HR / Payroll": "Finance",
};

const statusMeta: Record<Status, { icon: typeof Clock }> = {
  Pending: { icon: Clock },
  "In-Progress": { icon: Loader2 },
  Completed: { icon: CheckCircle2 },
};

const NEXT: Record<Status, Status> = {
  Pending: "In-Progress",
  "In-Progress": "Completed",
  Completed: "Pending",
};

export function OffboardingView({
  initialTasks,
  subjectName,
}: {
  initialTasks: OffboardingTask[];
  subjectName?: string;
}) {
  const [template, setTemplate] = React.useState(TEMPLATES[1]);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [override, setOverride] = React.useState(false);
  const [terminated, setTerminated] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Termination details (voluntary/involuntary, reason, rehire, notes).
  const [terminationType, setTerminationType] = React.useState<TerminationType>("Involuntary");
  const [reason, setReason] = React.useState(TERMINATION_REASONS.Involuntary[0]);
  const [rehireEligible, setRehireEligible] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  // Statutory-leave hardstop: the backend's 409 message when the lock trips.
  const [statutoryBlock, setStatutoryBlock] = React.useState<string | null>(null);
  const [hrCertified, setHrCertified] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);

  // Save-case state (persists the initiated offboarding to the backend).
  const [saving, setSaving] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Internal directory for the per-department delegation pickers.
  const [directory, setDirectory] = React.useState<
    { name: string; department: string; title: string }[]
  >([]);
  React.useEffect(() => {
    listEmployeeDirectory()
      .then(setDirectory)
      .catch(() => setDirectory([]));
  }, []);

  async function delegate(owner: Owner, assignee: string | null) {
    try {
      setActionError(null);
      setTasks(await setOffboardingAssignee(owner, assignee));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delegate tasks");
    }
  }

  // When deep-linked from the directory ("Initiate Offboarding"), the flow is
  // scoped to that employee; otherwise it falls back to the demo record.
  const subject = subjectName?.trim() || offboardingEmployee.name;
  const isCustomSubject = subject !== offboardingEmployee.name;

  const blockers = tasks.filter((t) => t.blocking && t.status !== "Completed");
  const canFinalize = blockers.length === 0 || override;

  async function cycle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = NEXT[task.status as Status];
    try {
      setActionError(null);
      setTasks(await setOffboardingTaskStatus(id, nextStatus));
    } catch (err) {
      // Keep the current list — a failed PATCH must not wipe the task matrix.
      setActionError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleSaveOffboarding() {
    try {
      setSaving(true);
      setSaveError(null);
      setSavedMsg(null);
      await saveOffboarding(subject, template);
      setSavedMsg(
        `Offboarding saved for ${subject} — the employee is now marked as Offboarding and the case survives reloads.`,
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save offboarding");
    } finally {
      setSaving(false);
    }
  }

  /** Finalize, optionally with the certified statutory-leave override. */
  async function handleFinalize(withStatutoryOverride: boolean) {
    try {
      setFinalizing(true);
      setActionError(null);
      await finalizeTermination(subject, {
        override,
        ...(withStatutoryOverride ? { statutoryOverride: true, hrCertified: true } : {}),
        terminationType,
        reason,
        rehireEligible,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setTerminated(true);
      setStatutoryBlock(null);
    } catch (err) {
      // Only mark terminated when the backend actually confirmed it.
      const message = err instanceof Error ? err.message : "Termination failed";
      if (message.includes("STATUTORY_LEAVE_LOCK")) {
        // Hardstop: surface the dedicated override flow instead of a plain error.
        setStatutoryBlock(message.replace(/^.*STATUTORY_LEAVE_LOCK:\s*/, ""));
        setHrCertified(false);
      } else {
        setActionError(message);
      }
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Offboarding"
        subtitle="Role-based separation workflows with IT/Admin termination automation and asset-clearance guardrails."
        action={
          <div className="flex items-center gap-2">
            <ToolLauncher surface="offboarding" />
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5">
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
          </div>
        }
      />

      {isCustomSubject && !terminated && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Offboarding initiated for <span className="font-semibold">{subject}</span>. Assign the
            separation checklist below, clear all blocking tasks, then finalize the termination.
          </span>
        </div>
      )}

      {/* Employee header */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={subject} size={44} />
            <div>
              <p className="text-base font-bold text-ink">{subject}</p>
              <p className="text-xs text-ink-muted">
                {isCustomSubject ? (
                  "Separation checklist"
                ) : (
                  <>
                    {offboardingEmployee.title} · Last day {formatDate(offboardingEmployee.lastDay)}
                  </>
                )}
              </p>
            </div>
          </div>
          <Badge tone={terminated ? "red" : "amber"}>
            {terminated ? "Terminated" : "Offboarding In Progress"}
          </Badge>
        </div>
      </Card>

      {/* Task matrix — one card per department, with delegation in the header. */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.owner === col.owner);
          const done = colTasks.filter((t) => t.status === "Completed").length;
          // Tasks in a column share one delegated owner (set via the header).
          const assignee = colTasks.find((t) => t.assignee)?.assignee ?? null;
          return (
            <Card key={col.owner} className="card-pad flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className={cn("text-sm font-bold", col.tone)}>{col.owner}</h3>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {done}/{colTasks.length} done
                  </p>
                </div>
              </div>
              <div className="mt-2.5 border-t border-line pt-2.5">
                <AssigneePicker
                  assignee={assignee}
                  homeDept={OWNER_HOME_DEPT[col.owner]}
                  directory={directory}
                  onAssign={(name) => delegate(col.owner, name)}
                  disabled={terminated}
                />
              </div>
              <div className="mt-3 space-y-2.5">
                {colTasks.map((t) => {
                  const Icon = statusMeta[t.status as Status].icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => cycle(t.id)}
                      disabled={terminated}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60",
                        t.blocking && t.status !== "Completed"
                          ? "border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10"
                          : "border-line",
                      )}
                      title="Click to advance status"
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          t.status === "Completed"
                            ? "text-emerald-500 dark:text-emerald-400"
                            : t.status === "In-Progress"
                              ? "text-amber-500 dark:text-amber-400"
                              : "text-ink-faint",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {t.blocking && t.status !== "Completed" && <BlockingTag />}
                          <span className="text-sm font-medium text-ink">{t.label}</span>
                        </span>
                        <span className="mt-1.5 block">
                          <TaskStatusPill status={t.status} />
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
            <Power className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Access kill switch
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            On <b>Terminated</b>, fires <code className="rounded bg-canvas px-1">employee.status.terminated</code>,
            invalidates session tokens and suspends Google Workspace, Microsoft 365 & Slack.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bell className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Manager handoff reminders
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Within 48 hours of the last day, uncompleted manager tasks trigger daily
            escalation alerts to the manager&apos;s dashboard and channels.
          </p>
        </Card>
        <Card className="card-pad">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldAlert className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Blocking task gate
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Tasks like <b>Recover Laptop</b> and <b>Sign Separation Release</b> are flagged{" "}
            <code className="rounded bg-canvas px-1">is_blocking_termination</code> and stop
            finalization until cleared.
          </p>
        </Card>
      </div>

      {/* Finalize panel */}
      <Card className="card-pad mt-5 border-red-200 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/10">
        <CardHeader title="System Termination Trigger" />
        {blockers.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-3 text-sm text-red-600 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Cannot terminate employee in system. Critical blocking tasks are outstanding:{" "}
              {blockers.map((b) => `[${b.owner}] ${b.label}`).join(", ")}.
            </span>
          </div>
        )}
        {/* Termination details — captured with the final decision and stored
            as an immutable record on the offboarding board. */}
        <div className="mt-4 rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Termination details
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Voluntary or involuntary</label>
              <select
                value={terminationType}
                onChange={(e) => {
                  const next = e.target.value as TerminationType;
                  setTerminationType(next);
                  setReason(TERMINATION_REASONS[next][0]);
                }}
                disabled={terminated}
                className="field-input"
              >
                <option value="Voluntary">Voluntary</option>
                <option value="Involuntary">Involuntary</option>
              </select>
            </div>
            <div>
              <label className="field-label">Reason for termination</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={terminated}
                className="field-input"
              >
                {TERMINATION_REASONS[terminationType].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Eligible for rehire</label>
              <select
                value={rehireEligible ? "Yes" : "No"}
                onChange={(e) => setRehireEligible(e.target.value === "Yes")}
                disabled={terminated}
                className="field-input"
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div>
              <label className="field-label">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={terminated}
                placeholder="e.g. Severance package accepted; references agreed"
                className="field-input resize-none"
              />
            </div>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400"
          />
          <b>Super Admin override</b> — force termination and log the bypass reason to the
          immutable audit trail.
        </label>
        {actionError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-3 text-sm text-red-600 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Statutory-leave hardstop — termination was rejected by the backend
            and can only proceed with an explicit, certified override. */}
        {statutoryBlock && !terminated && (
          <div className="mt-4 rounded-xl border-2 border-red-400 dark:border-red-500/60 bg-red-50 dark:bg-red-500/10 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  Termination blocked — employee on statutory leave
                </p>
                <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">{statutoryBlock}</p>
                <p className="mt-2 text-xs text-red-700/90 dark:text-red-300/90">
                  Terminating an employee on job-protected leave (Parental/Maternity, Sick,
                  Bereavement) is presumptively reprisal under the ESA. Proceed only if the
                  termination is genuinely unrelated to the leave.
                </p>
                <label className="mt-3 flex items-start gap-2 text-xs font-medium text-red-800 dark:text-red-200">
                  <input
                    type="checkbox"
                    checked={hrCertified}
                    onChange={(e) => setHrCertified(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600"
                  />
                  <span>
                    I certify that this termination complies with the <b>Human Rights Code</b>{" "}
                    and is wholly unrelated to the employee&apos;s pregnancy, parental status,
                    disability or exercise of statutory leave rights. This certification is
                    recorded in the audit trail.
                  </span>
                </label>
                <button
                  disabled={!hrCertified || finalizing}
                  onClick={() => handleFinalize(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {finalizing ? "Overriding…" : "Override & Finalize Termination"}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          disabled={!canFinalize || terminated || finalizing || !!statutoryBlock}
          onClick={() => handleFinalize(false)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {terminated
            ? "Employee Terminated"
            : finalizing
              ? "Finalizing…"
              : "Finalize System Termination"}
        </button>
        {terminated && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-300">
            Access revoked across all integrations. ROE schedule and final-pay countdown
            started.
          </p>
        )}
      </Card>

      {/* Save bar — persists the initiated offboarding case (QA: "Initiate
          Offboarding … does not actually save"). */}
      <Card className="card-pad mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Save this offboarding</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Persists the case for <b>{subject}</b> ({template}) — marks the employee as{" "}
              <b>Offboarding</b> so the separation survives reloads and appears in reporting.
            </p>
          </div>
          <button
            onClick={handleSaveOffboarding}
            disabled={saving || terminated}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Offboarding"}
          </button>
        </div>
        {savedMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}
        {saveError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
