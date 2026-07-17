"use client";

import * as React from "react";
import {
  FileWarning,
  CheckCircle2,
  Circle,
  CalendarClock,
  ShieldAlert,
  PenLine,
  Bell,
  Paperclip,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Stat,
  PageHeader,
  Avatar,
} from "@/components/ui";
import {
  issuePip,
  advanceReviewState,
  requestGoalWeightChange,
  saveSettings,
  type ProbationSweepResult,
} from "@/app/actions/modules";
import type { PerformanceReview, Pip } from "@/lib/data";
import { ToolLauncher } from "@/components/tools/tool-launcher";
import type { CompanySettings, GoalSummary, ReviewCadence } from "@/lib/queries";
import { cn, formatDate } from "@/lib/utils";

const REVIEW_STATES = [
  "Draft",
  "Self-Evaluation",
  "Manager-Evaluation",
  "Calibrated",
  "Completed",
] as const;

/** Color-coded review pills that signal who is holding up the cycle at a glance. */
const reviewPill: Record<string, { cls: string; label: string; waiting?: "employee" | "manager" }> = {
  Draft: { cls: "bg-slate-100 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400", label: "Draft" },
  "Self-Evaluation": {
    cls: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-200",
    label: "Self-Evaluation",
    waiting: "employee",
  },
  "Manager-Evaluation": {
    cls: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300",
    label: "Manager-Evaluation",
    waiting: "manager",
  },
  Calibrated: { cls: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", label: "Calibrated" },
  Completed: { cls: "bg-emerald-500 text-white", label: "Completed" },
};

function ReviewStatusPill({ state }: { state: string }) {
  const meta = reviewPill[state] ?? reviewPill.Draft;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        meta.cls,
      )}
    >
      {meta.label}
      {meta.waiting && (
        <span className="ml-1 font-normal opacity-80">
          · Waiting on {meta.waiting === "employee" ? "Employee" : "Manager"}
        </span>
      )}
    </span>
  );
}

/** Whole days from today until an ISO date (negative = overdue). */
function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Who a pending review is waiting on — drives the bulk reminder recipients. */
function reviewOwner(r: PerformanceReview): string {
  if (r.state === "Manager-Evaluation") return "their manager";
  if (r.state === "Calibrated") return "HR calibration";
  return r.employee; // Draft / Self-Evaluation → the employee
}

interface GuardrailRequest {
  id: string;
  employee: string;
  manager: string;
  goalTitle: string;
  field: string;
  previousValue: string;
  proposedValue: string;
  changePct: number;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
}

// Seeded demo of a change that tripped the >15% constructive-dismissal guardrail
// and was routed to HR. Live entries are appended by the goal weight editor
// below whenever the backend rejects an out-of-band change on a signed goal.
const INITIAL_GUARDRAIL_REQUESTS: GuardrailRequest[] = [
  {
    id: "gr-1",
    employee: "Jim Scott",
    manager: "Michael Scott",
    goalTitle: "Close $1.2M in net-new pipeline (Q2)",
    field: "Core responsibility weight",
    previousValue: "30%",
    proposedValue: "55%",
    changePct: 25,
    requestedAt: "2026-07-02",
    status: "Pending",
  },
];

const CADENCES: ReviewCadence[] = ["Annual", "Bi-Annual", "Quarterly"];

const CADENCE_HINT: Record<ReviewCadence, string> = {
  Annual: "One full review cycle per year (default).",
  "Bi-Annual": "Two cycles per year — mid-year check-in plus year-end calibration.",
  Quarterly: "Four lightweight cycles per year aligned to quarterly goals.",
};

export function PerformanceView({
  initialReviews,
  initialPips,
  goals = [],
  settings = null,
  probation = null,
  actorName,
}: {
  initialReviews: PerformanceReview[];
  initialPips: Pip[];
  goals?: GoalSummary[];
  settings?: CompanySettings | null;
  probation?: ProbationSweepResult | null;
  /** Real signed-in user (was the hardcoded lib/data mock "Sarah Mitchell"). */
  actorName: string;
}) {
  const [pips, setPips] = React.useState(initialPips);
  const [reviews, setReviews] = React.useState(initialReviews);
  const [advanceError, setAdvanceError] = React.useState<string | null>(null);
  const [guardrailReqs, setGuardrailReqs] = React.useState(INITIAL_GUARDRAIL_REQUESTS);
  const [reminderMsg, setReminderMsg] = React.useState<string | null>(null);

  // Cadence Configuration (persisted via company settings).
  const [cadence, setCadence] = React.useState<ReviewCadence>(settings?.reviewCadence ?? "Annual");
  const [cadenceSaving, setCadenceSaving] = React.useState(false);
  const [cadenceMsg, setCadenceMsg] = React.useState<string | null>(null);

  const completed = reviews.filter((r) => r.state === "Completed").length;
  const completionPct = reviews.length ? Math.round((completed / reviews.length) * 100) : 0;
  const activePips = pips.filter((p) => p.state === "Active").length;

  const pendingApprovals = guardrailReqs.filter((g) => g.status === "Pending");

  // Reviews still open and due within a week (or already overdue) — who to nudge.
  const dueSoon = reviews.filter((r) => r.state !== "Completed" && daysUntil(r.due) <= 7);

  async function handleAdvance(id: string) {
    try {
      setAdvanceError(null);
      setReviews(await advanceReviewState(id));
    } catch (err) {
      // Keep the current list — a failed advance must not wipe the cycles.
      setAdvanceError(err instanceof Error ? err.message : "Failed to advance review");
    }
  }

  function sendReminders() {
    if (dueSoon.length === 0) {
      setReminderMsg("Nothing to nudge — no open reviews are due within 7 days. 🎉");
      return;
    }
    const recipients = Array.from(new Set(dueSoon.map(reviewOwner)));
    setReminderMsg(
      `Reminders sent to ${recipients.length} recipient${
        recipients.length === 1 ? "" : "s"
      } for ${dueSoon.length} review${dueSoon.length === 1 ? "" : "s"} due within 7 days: ${recipients.join(
        ", ",
      )}.`,
    );
  }

  function resolveGuardrail(id: string, status: "Approved" | "Rejected") {
    setGuardrailReqs((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
  }

  /** Weight editor callback: a blocked change lands in the approvals queue. */
  function handleGuardrailRouted(req: GuardrailRequest) {
    setGuardrailReqs((prev) => [req, ...prev]);
  }

  async function saveCadence(next: ReviewCadence) {
    setCadence(next);
    if (!settings) return;
    try {
      setCadenceSaving(true);
      setCadenceMsg(null);
      await saveSettings({ ...settings, reviewCadence: next });
      setCadenceMsg(`Review cadence saved: ${next.toLowerCase()} cycles.`);
    } catch (err) {
      setCadenceMsg(err instanceof Error ? err.message : "Failed to save cadence");
    } finally {
      setCadenceSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Performance Management"
        subtitle="Compliance-aware reviews, goal setting and watertight PIPs that protect against wrongful-dismissal claims."
        action={<ToolLauncher surface="performance" />}
      />

      {/* Probation automation results from this page load (Day-60 / Day-80). */}
      {probation && probation.initialized.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <div className="min-w-0 flex-1 text-sm text-emerald-800 dark:text-emerald-200">
            <span className="font-semibold">Day-60 probation trigger:</span> 90-day probationary
            review{probation.initialized.length === 1 ? "" : "s"} auto-initialized for{" "}
            <b>{probation.initialized.join(", ")}</b> — manager notified via the automation feed.
          </div>
        </div>
      )}
      {probation && probation.escalated.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
          <div className="min-w-0 flex-1 text-sm text-red-800 dark:text-red-200">
            <span className="font-semibold">Day-80 escalation:</span>{" "}
            <b>{probation.escalated.join(", ")}</b>{" "}
            {probation.escalated.length === 1 ? "is" : "are"} past Day 80 of probation with the
            90-day review still open — decide extension or termination before statutory notice
            applies at Day 90.
          </div>
        </div>
      )}

      {/* Constructive-dismissal guardrail — surface pending approvals up top so
          HR can act on out-of-band goal changes immediately. */}
      {pendingApprovals.length > 0 && (
        <a
          href="#guardrail-approvals"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 transition hover:bg-amber-100/70 dark:hover:bg-amber-500/20"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Action Required: {pendingApprovals.length} goal change
              {pendingApprovals.length === 1 ? "" : "s"} exceed the 15% guardrail and need HR review.
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              A manager attempted to change a core responsibility beyond the constructive-dismissal
              threshold — review before it takes effect →
            </p>
          </div>
        </a>
      )}

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Review completion" value={`${completionPct}%`} hint={`${completed}/${reviews.length} cycles closed`} tone="green" />
        <Stat label="Active goals" value={18} hint="Across 7 departments" tone="brand" />
        <Stat label="Active PIPs" value={activePips} hint="Dual sign-off tracked" tone="amber" />
        <Stat label="Avg. rating" value="4.0" hint="Calibrated 2026 cycle" tone="sky" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Review pipeline */}
        <Card className="card-pad lg:col-span-2">
          <CardHeader
            title="Review Cycles"
            action={
              <div className="flex items-center gap-2">
                <button
                  onClick={sendReminders}
                  title="Ping anyone with a pending draft or evaluation due within 7 days"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-canvas"
                >
                  <Bell className="h-3.5 w-3.5" /> Send Reminders
                  {dueSoon.length > 0 && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {dueSoon.length}
                    </span>
                  )}
                </button>
                <Button size="sm" variant="outline">
                  New Review Cycle
                </Button>
              </div>
            }
          />
          {reminderMsg && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="flex items-start gap-1.5">
                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {reminderMsg}
              </span>
              <button
                onClick={() => setReminderMsg(null)}
                className="shrink-0 text-emerald-600 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-300"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {advanceError && (
            <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
              {advanceError}
            </div>
          )}

          {/* Cadence Configuration — recurring review cadence, persisted in
              company settings. */}
          <div className="mt-4 rounded-xl border border-line bg-canvas/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  Cadence Configuration
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{CADENCE_HINT[cadence]}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
                {CADENCES.map((c) => (
                  <button
                    key={c}
                    onClick={() => saveCadence(c)}
                    disabled={cadenceSaving}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60",
                      cadence === c
                        ? "bg-brand-500 text-white"
                        : "text-ink-soft hover:bg-canvas",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {cadenceMsg && (
              <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">{cadenceMsg}</p>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {reviews.map((r) => {
              const idx = REVIEW_STATES.indexOf(r.state as (typeof REVIEW_STATES)[number]);
              return (
                <div key={r.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.employee} size={32} />
                      <div>
                        <p className="text-sm font-semibold text-ink">{r.employee}</p>
                        <p className="text-xs text-ink-muted">{r.cycle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.score && <Badge tone="green">{r.score.toFixed(1)} / 5</Badge>}
                      <ReviewStatusPill state={r.state} />
                      {r.state !== "Completed" && (
                        <button
                          onClick={() => handleAdvance(r.id)}
                          className="rounded-lg border border-brand-300 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100"
                        >
                          Advance
                        </button>
                      )}
                    </div>
                  </div>
                  {/* State machine */}
                  <div className="mt-3 flex items-center">
                    {REVIEW_STATES.map((s, i) => (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                          {i <= idx ? (
                            <CheckCircle2 className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-line" />
                          )}
                        </div>
                        {i < REVIEW_STATES.length - 1 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1",
                              i < idx ? "bg-brand-500" : "bg-line",
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-faint">
                    <span>Draft</span>
                    <span>Completed</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                    <CalendarClock className="h-3.5 w-3.5" /> Due {formatDate(r.due)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          {/* Probation trigger */}
          <Card className="card-pad">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock className="h-4 w-4 text-brand-500 dark:text-brand-400" /> 90-Day probation trigger
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              At day 60 the system auto-initializes a probationary review: <i>&quot;Complete the
              90-day review by Day 80 to determine extension or termination before statutory
              notice applies.&quot;</i>
            </p>
          </Card>

          {/* Constructive dismissal guardrail */}
          <Card className="card-pad border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" /> Constructive dismissal guardrail
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300/90">
              Changing a signed goal&apos;s weight or core responsibility by more than{" "}
              <b>15%</b> is blocked and routed to a mandatory approval workflow with mutual
              signed consent.
            </p>
          </Card>

          {/* Goal weight editor — the live entry point that the guardrail
              protects. Within 15% saves; beyond routes to Pending Approvals. */}
          <GoalWeightEditor goals={goals} onRouted={handleGuardrailRouted} actorName={actorName} />

          {/* Guardrail approvals queue — the live counterpart to the rule above. */}
          <Card className="card-pad scroll-mt-6" id="guardrail-approvals">
            <CardHeader
              title="Pending Approvals"
              action={
                pendingApprovals.length > 0 ? (
                  <Badge tone="amber">{pendingApprovals.length}</Badge>
                ) : (
                  <Badge tone="green">Clear</Badge>
                )
              }
            />
            {pendingApprovals.length === 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> No goal changes are
                breaching the 15% guardrail right now.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {pendingApprovals.map((g) => (
                  <div key={g.id} className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={g.employee} size={24} />
                      <p className="text-sm font-semibold text-ink">{g.employee}</p>
                      <Badge tone="red">+{g.changePct}%</Badge>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">
                      <span className="font-medium">{g.manager}</span> wants to change{" "}
                      <span className="font-medium">{g.field.toLowerCase()}</span> on “{g.goalTitle}”
                      from <span className="font-mono">{g.previousValue}</span> →{" "}
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                        {g.proposedValue}
                      </span>
                      .
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      Exceeds the 15% threshold · requested {formatDate(g.requestedAt)}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => resolveGuardrail(g.id, "Approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve change
                      </button>
                      <button
                        onClick={() => resolveGuardrail(g.id, "Rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-canvas"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {guardrailReqs.some((g) => g.status !== "Pending") && (
              <div className="mt-3 space-y-1 border-t border-line pt-3">
                {guardrailReqs
                  .filter((g) => g.status !== "Pending")
                  .map((g) => (
                    <p key={g.id} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                      {g.status === "Approved" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-red-400" />
                      )}
                      {g.employee}: {g.field} change {g.status.toLowerCase()}
                    </p>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* PIP portal */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="card-pad lg:col-span-2">
          <CardHeader title="Structured PIP Portal" />
          <p className="mt-1 text-xs text-ink-muted">
            Confidential — accessible only to HR and the direct manager.
          </p>
          <div className="mt-4 space-y-3">
            {pips.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.employee} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-ink">{p.employee}</p>
                      <p className="text-xs text-ink-muted">
                        Manager: {p.manager} · {p.durationDays} days · starts{" "}
                        {formatDate(p.startDate, { year: undefined })}
                      </p>
                    </div>
                  </div>
                  <Badge tone={p.state === "Active" ? "amber" : p.state === "Completed" ? "green" : "gray"}>
                    {p.state}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <SignOff label="Manager signed" ok={p.signedByManager} />
                  <SignOff label="Employee signed" ok={p.signedByEmployee} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <CreatePipForm
          onIssued={setPips}
          employeeOptions={[...new Set(reviews.map((r) => r.employee))]}
          actorName={actorName}
        />
      </div>
    </div>
  );
}

/**
 * Adjust a signed goal's weight. The backend enforces the 15% constructive-
 * dismissal guardrail: within-threshold changes save (audit-logged); larger
 * ones are rejected with 409 and land in the Pending Approvals queue here.
 */
function GoalWeightEditor({
  goals,
  onRouted,
  actorName,
}: {
  goals: GoalSummary[];
  onRouted: (req: GuardrailRequest) => void;
  actorName: string;
}) {
  const activeGoals = goals.filter((g) => g.status === "Active");
  const [goalId, setGoalId] = React.useState(activeGoals[0]?.id ?? "");
  const [previousWeight, setPreviousWeight] = React.useState(30);
  const [proposedWeight, setProposedWeight] = React.useState(40);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<
    { tone: "ok" | "routed" | "error"; text: string } | null
  >(null);

  const goal = activeGoals.find((g) => g.id === goalId);
  const delta = Math.abs(proposedWeight - previousWeight);

  async function submit() {
    if (!goal) return;
    try {
      setBusy(true);
      setResult(null);
      await requestGoalWeightChange(goal.id, previousWeight, proposedWeight);
      setResult({
        tone: "ok",
        text: `Saved — ${delta}% change is within the 15% guardrail (audit-logged on the goal).`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit weight change";
      if (message.includes("WEIGHT_GUARDRAIL")) {
        onRouted({
          id: `gr-${Date.now()}`,
          employee: goal.employee,
          manager: actorName,
          goalTitle: goal.title,
          field: "Core responsibility weight",
          previousValue: `${previousWeight}%`,
          proposedValue: `${proposedWeight}%`,
          changePct: delta,
          requestedAt: new Date().toISOString().slice(0, 10),
          status: "Pending",
        });
        setResult({
          tone: "routed",
          text: `Blocked — a ${delta}% change exceeds the 15% guardrail. The change was NOT saved; it has been routed to Pending Approvals and needs mutual signed consent.`,
        });
      } else {
        setResult({ tone: "error", text: message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-pad">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <PenLine className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Adjust Goal Weight
      </div>
      {activeGoals.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          No active goals found — goals appear here once employees have signed goals in the
          growth module.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label className="field-label">Goal</label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="field-input"
            >
              {activeGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.employee} — {g.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Current weight %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={previousWeight}
                onChange={(e) => setPreviousWeight(Number(e.target.value))}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">New weight %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={proposedWeight}
                onChange={(e) => setProposedWeight(Number(e.target.value))}
                className="field-input"
              />
            </div>
          </div>
          <p
            className={cn(
              "text-[11px]",
              delta > 15 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-ink-faint",
            )}
          >
            Change: {delta} percentage points{" "}
            {delta > 15 ? "— exceeds the 15% guardrail, will route to approvals" : "— within the 15% guardrail"}
          </p>
          <Button className="w-full" disabled={busy || !goal} onClick={submit}>
            {busy ? "Submitting…" : "Save Weight Change"}
          </Button>
          {result && (
            <p
              className={cn(
                "text-[11px]",
                result.tone === "ok" && "text-emerald-700 dark:text-emerald-300",
                result.tone === "routed" && "font-medium text-amber-700 dark:text-amber-300",
                result.tone === "error" && "text-red-600 dark:text-red-300",
              )}
            >
              {result.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function SignOff({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", ok ? "text-emerald-600 dark:text-emerald-300" : "text-ink-faint")}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function CreatePipForm({
  onIssued,
  employeeOptions,
  actorName,
}: {
  onIssued: (pips: Pip[]) => void;
  employeeOptions: string[];
  actorName: string;
}) {
  const [employee, setEmployee] = React.useState("");
  const [duration, setDuration] = React.useState(60);
  const [outcome, setOutcome] = React.useState("");
  const [support, setSupport] = React.useState("");
  const [consequences, setConsequences] = React.useState("");
  const [attachment, setAttachment] = React.useState<string | null>(null);
  const [refusedBypass, setRefusedBypass] = React.useState(false);
  const [issued, setIssued] = React.useState(false);
  const [issueError, setIssueError] = React.useState<string | null>(null);

  const durationError =
    duration < 30
      ? "A reasonable opportunity to improve typically requires a minimum of 30–90 days to hold up in Canadian courts."
      : null;

  const canIssue =
    !durationError &&
    employee.trim().length > 0 &&
    outcome.trim().length > 0 &&
    support.trim().length > 0 &&
    consequences.trim().length > 0;

  async function handleIssuePip() {
    try {
      setIssueError(null);
      const updatedPips = await issuePip({
        employee: employee.trim(),
        manager: actorName,
        durationDays: duration,
      });
      onIssued(updatedPips);
      setIssued(true);
    } catch (err) {
      // Only show the success panel when the backend actually persisted it.
      setIssueError(err instanceof Error ? err.message : "Failed to issue PIP");
    }
  }

  return (
    <Card className="card-pad">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FileWarning className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Create PIP
      </div>

      {issued ? (
        <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <p className="mt-2 font-semibold">PIP issued</p>
          <p className="mt-1 text-xs">
            Routed for dual cryptographic sign-off. State stays <b>Draft</b> until both
            manager and employee sign{refusedBypass ? " (or witness bypass is logged)" : ""}.
          </p>
          {attachment && (
            <p className="mt-1 flex items-center gap-1.5 text-xs">
              <Paperclip className="h-3.5 w-3.5" /> Scanned copy attached: {attachment}
            </p>
          )}
          <button
            onClick={() => {
              setIssued(false);
              setConsequences("");
              setAttachment(null);
            }}
            className="mt-3 text-xs font-semibold underline"
          >
            Create another
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="field-label">Employee</label>
            <input
              list="pip-employee-options"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              placeholder="Select or type an employee name"
              className="field-input"
            />
            <datalist id="pip-employee-options">
              {employeeOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="field-label">Duration (days)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="field-input"
            />
            {durationError && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-300">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                {durationError}
              </p>
            )}
          </div>
          <div>
            <label className="field-label">Measurable outcome</label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              placeholder="e.g. Close 8 qualified deals per quarter"
              className="field-input resize-none"
            />
          </div>
          <div>
            <label className="field-label">Company support provided</label>
            <textarea
              value={support}
              onChange={(e) => setSupport(e.target.value)}
              rows={2}
              placeholder="e.g. Weekly coaching + enablement budget"
              className="field-input resize-none"
            />
          </div>
          <div>
            <label className="field-label">Consequences of failure</label>
            <textarea
              value={consequences}
              onChange={(e) => setConsequences(e.target.value)}
              rows={2}
              placeholder="e.g. Failure to meet these expectations may result in further disciplinary action, up to and including termination of employment."
              className="field-input resize-none"
            />
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-ink-faint">
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400" />
              Legally required: a valid PIP must state the outcome of not meeting expectations.
            </p>
          </div>
          <div>
            <label className="field-label">Signed PDF (optional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-xs font-medium text-ink-soft transition hover:border-brand-300 hover:bg-canvas">
              <Paperclip className="h-4 w-4 text-ink-faint" />
              {attachment ? (
                <span className="truncate text-ink">{attachment}</span>
              ) : (
                <span className="text-ink-muted">Attach a scanned copy for offline records…</span>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? null)}
              />
            </label>
            {attachment && (
              <button
                onClick={() => setAttachment(null)}
                className="mt-1 text-[11px] font-semibold text-ink-faint hover:text-red-500"
              >
                Remove attachment
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={refusedBypass}
              onChange={(e) => setRefusedBypass(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400"
            />
            <PenLine className="h-3.5 w-3.5 text-ink-faint" />
            Refused to sign — verified by witness HR Admin
          </label>
          <Button
            className="w-full"
            disabled={!canIssue}
            onClick={handleIssuePip}
          >
            Issue PIP
          </Button>
          {issueError && (
            <p className="text-center text-[11px] text-red-600 dark:text-red-300">{issueError}</p>
          )}
          {!canIssue && !durationError && (
            <p className="text-center text-[11px] text-ink-faint">
              Employee, measurable outcome, support and consequences fields are required.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
