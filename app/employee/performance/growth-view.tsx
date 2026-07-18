"use client";

import * as React from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Link2,
  ListChecks,
  Lock,
  MessageSquare,
  MessagesSquare,
  Plus,
  Send,
  Target,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, ProgressBar, Ring } from "@/components/ui";
import {
  addActionItem,
  addTalkingPoint,
  giveKudos,
  removeTalkingPoint,
  requestPeerFeedback,
  respondPeerFeedback,
  toggleActionItem,
  updateGoalProgress,
} from "@/app/actions/growth";
import {
  acknowledgeReview,
  submitManagerEvaluation,
  submitSelfEvaluation,
} from "@/app/actions/modules";
import type { MyReviews, PerformanceReview } from "@/lib/data";
import type {
  Colleague,
  GrowthGoal,
  GrowthOverview,
  KudosItem,
  OneOnOneSync,
  PeerFeedback,
} from "@/lib/growth";
import { formatDate } from "@/lib/utils";

type Tab = "overview" | "syncs" | "feedback" | "career";

interface Viewer {
  name: string;
  title: string;
  department: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "syncs", label: "1-on-1s" },
  { key: "feedback", label: "Feedback" },
  { key: "career", label: "Career Path" },
];

const KUDOS_EMOJI = ["🎉", "🏆", "🙌", "💡", "🚀", "❤️"];

/* Company competency framework — what the next level looks like. */
const COMPETENCIES: { name: string; nextLevel: string; evidence: string }[] = [
  {
    name: "Craft & Execution",
    nextLevel: "Owns complex, ambiguous work end-to-end and raises the quality bar for the team.",
    evidence: "Goals delivered on time, certifications, peer courses you've published.",
  },
  {
    name: "Business Impact",
    nextLevel: "Ties day-to-day work to revenue, retention, or efficiency and can show the numbers.",
    evidence: "Goal outcomes linked to company strategy (see your alignment tags).",
  },
  {
    name: "Communication & Influence",
    nextLevel: "Communicates clearly across teams and brings stakeholders along before decisions land.",
    evidence: "Peer feedback on presentations, cross-team project notes.",
  },
  {
    name: "Collaboration & Mentorship",
    nextLevel: "Actively levels up teammates — onboarding, mentoring, and sharing knowledge.",
    evidence: "Mentoring goals, kudos from teammates, courses in Creator Studio.",
  },
  {
    name: "Ownership & Initiative",
    nextLevel: "Spots problems nobody owns and fixes them without being asked.",
    evidence: "1-on-1 action items you drove to done, process improvements you started.",
  },
];

/** Deterministic next-step title from the current one. */
function nextRole(title: string): string {
  if (/director|head of/i.test(title)) return `Senior ${title}`;
  if (/manager/i.test(title)) return title.replace(/manager/i, "Director");
  if (/^(senior|sr\.?)\s/i.test(title)) return title.replace(/^(senior|sr\.?)\s/i, "Lead ");
  if (/^lead\s/i.test(title)) return title.replace(/^lead\s/i, "") + " Manager";
  return `Senior ${title}`;
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function syncTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso.slice(0, 10))} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function GrowthView({
  viewer,
  growth,
  myReviews,
  colleagues,
}: {
  viewer: Viewer;
  growth: GrowthOverview;
  myReviews: MyReviews;
  colleagues: Colleague[];
}) {
  const [tab, setTab] = React.useState<Tab>("overview");
  const [reviews, setReviews] = React.useState<MyReviews>(myReviews);
  const [goals, setGoals] = React.useState(growth.goals);
  const [sync, setSync] = React.useState(growth.nextSync);
  const [feedbackSent, setFeedbackSent] = React.useState(growth.feedbackSent);
  const [feedbackInbox, setFeedbackInbox] = React.useState(growth.feedbackInbox);
  const kudos = growth.kudos;
  const [error, setError] = React.useState<string | null>(null);

  const activeGoals = goals.filter((g) => g.status === "Active");
  const avgGoal = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;
  const pendingInbox = feedbackInbox.filter((f) => f.status === "Pending");

  async function guard<T>(work: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    try {
      return await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
      return undefined;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">My Growth</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Own your development — goals, 1-on-1s, feedback, and your path forward.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => {
          const chip =
            t.key === "feedback" && pendingInbox.length > 0 ? pendingInbox.length : undefined;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "-mb-px border-b-2 border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400"
                  : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
              }
            >
              {t.label}
              {chip !== undefined && (
                <span className="ml-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {chip}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {tab === "overview" && (
        <OverviewTab
          goals={goals}
          avgGoal={avgGoal}
          activeCount={activeGoals.length}
          sync={sync}
          reviews={reviews}
          onReviews={setReviews}
          guard={guard}
          onUpdateGoal={(id, input) =>
            guard(async () => {
              const next = await updateGoalProgress(id, input);
              setGoals(next);
            })
          }
          goToSyncs={() => setTab("syncs")}
        />
      )}

      {tab === "syncs" && (
        <SyncsTab
          sync={sync}
          viewerName={viewer.name}
          onChange={setSync}
          guard={guard}
        />
      )}

      {tab === "feedback" && (
        <FeedbackTab
          viewerName={viewer.name}
          colleagues={colleagues}
          sent={feedbackSent}
          inbox={feedbackInbox}
          kudos={kudos}
          onSent={setFeedbackSent}
          onInbox={setFeedbackInbox}
          guard={guard}
        />
      )}

      {tab === "career" && (
        <CareerTab viewer={viewer} goals={goals} goToFeedback={() => setTab("feedback")} />
      )}
    </div>
  );
}

/* ============================== Overview ============================== */

function OverviewTab({
  goals,
  avgGoal,
  activeCount,
  sync,
  reviews,
  onReviews,
  guard,
  onUpdateGoal,
  goToSyncs,
}: {
  goals: GrowthGoal[];
  avgGoal: number;
  activeCount: number;
  sync: OneOnOneSync | null;
  reviews: MyReviews;
  onReviews: (r: MyReviews) => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
  onUpdateGoal: (id: string, input: { progress: number; note?: string }) => Promise<unknown>;
  goToSyncs: () => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openEditor(g: GrowthGoal) {
    setEditing(g.id);
    setProgress(g.progress);
    setNote("");
  }

  async function save(id: string) {
    setSaving(true);
    await onUpdateGoal(id, { progress, note: note.trim() || undefined });
    setSaving(false);
    setEditing(null);
  }

  const upcoming = sync && daysUntil(sync.scheduledAt) >= 0 ? sync : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Goals */}
      <Card className="card-pad lg:col-span-8">
        <CardHeader
          title="Active Goals"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <Target className="h-3.5 w-3.5" /> {avgGoal}% avg
            </span>
          }
        />
        <div className="mt-4 space-y-5">
          {goals.length === 0 && (
            <p className="text-sm text-ink-muted">
              No goals yet — set them with your manager in your next 1-on-1.
            </p>
          )}
          {goals.map((g) => {
            const lastUpdate = g.updates[0];
            return (
              <div key={g.id} className="rounded-xl border border-line/70 p-4">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink-soft">{g.title}</p>
                    {g.status === "Completed" && <Badge tone="green">Completed</Badge>}
                  </div>
                  {g.due && (
                    <span className="text-xs text-ink-faint">
                      Due {formatDate(g.due, { year: undefined })}
                    </span>
                  )}
                </div>
                {g.alignment && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                    <Link2 className="h-3 w-3" /> Linked to: {g.alignment}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <ProgressBar value={g.progress} />
                  <span className="w-9 text-right text-xs font-semibold text-ink-soft">
                    {g.progress}%
                  </span>
                  {editing !== g.id && g.status !== "Completed" && (
                    <button
                      onClick={() => openEditor(g)}
                      className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-canvas"
                    >
                      Update Progress
                    </button>
                  )}
                </div>
                {lastUpdate && editing !== g.id && (
                  <p className="mt-2 text-[11px] text-ink-faint">
                    Last update {formatDate(lastUpdate.at.slice(0, 10), { year: undefined })}
                    {lastUpdate.note ? ` — “${lastUpdate.note}”` : ""}
                  </p>
                )}
                {editing === g.id && (
                  <div className="mt-3 rounded-lg bg-canvas p-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        className="flex-1 accent-brand-500"
                      />
                      <span className="w-10 text-right text-sm font-bold text-ink">{progress}%</span>
                    </div>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={1000}
                      placeholder="What moved this week? (optional note)"
                      className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-xs outline-none focus:border-brand-400"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-card"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => save(g.id)}
                        disabled={saving}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Log update"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Overall ring */}
      <Card className="card-pad lg:col-span-4">
        <CardHeader title="Overall" />
        <div className="flex flex-col items-center py-3">
          <Ring value={avgGoal} sublabel="Goals" />
          <p className="mt-3 text-center text-xs text-ink-muted">
            {activeCount === 0
              ? "All goals wrapped — time to set the next ones."
              : "You're on track this cycle. Keep the momentum!"}
          </p>
        </div>
      </Card>

      {/* Upcoming milestone */}
      <Card className="card-pad lg:col-span-5">
        <CardHeader title="Upcoming Milestone" />
        {upcoming ? (
          <button
            onClick={goToSyncs}
            className="mt-4 flex w-full items-center gap-3 rounded-xl bg-canvas p-4 text-left transition hover:bg-brand-50/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
              <CalendarClock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                1-on-1 with {upcoming.managerName}
              </span>
              <span className="block text-xs text-ink-muted">
                {syncTimeLabel(upcoming.scheduledAt)} · in {daysUntil(upcoming.scheduledAt)} day
                {daysUntil(upcoming.scheduledAt) === 1 ? "" : "s"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
          </button>
        ) : (
          <p className="mt-4 rounded-xl bg-canvas p-4 text-sm text-ink-muted">
            Nothing on the calendar yet — your manager schedules your next sync.
          </p>
        )}
      </Card>

      {/* Self-evaluation */}
      <Card className="card-pad flex flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-700 text-white lg:col-span-7">
        <div>
          <MessageSquare className="h-6 w-6" />
          <h3 className="mt-3 text-base font-bold">Self-Evaluation is open</h3>
          <p className="mt-1 max-w-md text-sm text-white/80">
            Share your wins and growth areas before your manager&apos;s review. Your input shapes a
            two-way conversation — due in 5 days.
          </p>
        </div>
        <button className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-400 transition-colors hover:bg-white/90">
          Start Self-Evaluation <ArrowRight className="h-4 w-4" />
        </button>
      </Card>

      {/* History */}
      <Card className="card-pad lg:col-span-12">
        <ReviewsCard reviews={reviews} onReviews={onReviews} guard={guard} />
      </Card>
    </div>
  );
}

/* ============================ Performance reviews ============================ */

/** Guided prompts — distilled from BambooHR / 15Five / Lattice review templates. */
const SELF_PROMPTS = [
  "What accomplishments are you most proud of this cycle?",
  "What are your top strengths, and how did you apply them?",
  "What could have gone better, and what support would help?",
  "What are your top priorities for the next cycle?",
];
const MANAGER_PROMPTS = [
  "What were their most meaningful contributions this cycle?",
  "Where should they focus their growth next cycle?",
  "How will you support them in getting there?",
];

function reviewPhaseLabel(r: PerformanceReview, mine: boolean): string {
  switch (r.state) {
    case "Draft":
      return "Being prepared by HR";
    case "Self-Evaluation":
      return mine ? "Your self-assessment is due" : "Waiting on their self-assessment";
    case "Manager-Evaluation":
      return mine ? "With your manager" : "Your evaluation is due";
    case "Calibrated":
      return "In HR calibration";
    case "Completed":
      return "Shared";
  }
}

function ReviewsCard({
  reviews,
  onReviews,
  guard,
}: {
  reviews: MyReviews;
  onReviews: (r: MyReviews) => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [selfFor, setSelfFor] = React.useState<PerformanceReview | null>(null);
  const [evalFor, setEvalFor] = React.useState<PerformanceReview | null>(null);
  const [viewing, setViewing] = React.useState<PerformanceReview | null>(null);

  return (
    <>
      <CardHeader title="Performance Reviews" />
      <div className="mt-3 divide-y divide-line">
        {reviews.mine.length === 0 && (
          <p className="py-3 text-sm text-ink-muted">No formal reviews on file yet.</p>
        )}
        {reviews.mine.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{r.cycle}</p>
              <p className="text-xs text-ink-muted">
                Due {formatDate(r.due)} · {reviewPhaseLabel(r, true)}
              </p>
            </div>
            {r.state === "Self-Evaluation" && (
              <Button size="sm" onClick={() => setSelfFor(r)}>
                Complete self-assessment
              </Button>
            )}
            {r.state === "Completed" ? (
              <>
                {r.score != null && <Badge tone="green">{r.score.toFixed(1)} / 5</Badge>}
                {r.acknowledgedAt && <Badge tone="gray">Acknowledged</Badge>}
                <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                  View
                </Button>
              </>
            ) : (
              r.state !== "Self-Evaluation" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  <Lock className="h-3.5 w-3.5" /> Shared once completed
                </span>
              )
            )}
          </div>
        ))}
      </div>

      {/* Manager capacity: reviews of direct reports awaiting this manager. */}
      {reviews.reports.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/10 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Your team&apos;s reviews
          </p>
          <div className="mt-1 divide-y divide-amber-200/60 dark:divide-amber-500/20">
            {reviews.reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.employee}</p>
                  <p className="text-xs text-ink-muted">
                    {r.cycle} · {reviewPhaseLabel(r, false)}
                  </p>
                </div>
                {r.state === "Manager-Evaluation" ? (
                  <Button size="sm" onClick={() => setEvalFor(r)}>
                    Write evaluation
                  </Button>
                ) : (
                  <span className="text-xs text-ink-faint">{reviewPhaseLabel(r, false)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-faint">
        Your manager can&apos;t see your self-assessment until you submit it, and their evaluation is
        shared with you only after HR completes the cycle.
      </p>

      {selfFor && (
        <WriteEvaluationModal
          title={`Self-assessment — ${selfFor.cycle}`}
          prompts={SELF_PROMPTS}
          submitLabel="Submit self-assessment"
          withScore={false}
          onClose={() => setSelfFor(null)}
          onSubmit={async (text) => {
            const next = await guard(() => submitSelfEvaluation(selfFor.id, text));
            if (next) {
              onReviews(next);
              setSelfFor(null);
            }
          }}
        />
      )}
      {evalFor && (
        <WriteEvaluationModal
          title={`Evaluation — ${evalFor.employee} · ${evalFor.cycle}`}
          prompts={MANAGER_PROMPTS}
          context={
            evalFor.selfEvaluation
              ? { label: `${evalFor.employee.split(" ")[0]}'s self-assessment`, text: evalFor.selfEvaluation }
              : undefined
          }
          submitLabel="Submit evaluation"
          withScore
          onClose={() => setEvalFor(null)}
          onSubmit={async (text, score) => {
            const next = await guard(() => submitManagerEvaluation(evalFor.id, text, score));
            if (next) {
              onReviews(next);
              setEvalFor(null);
            }
          }}
        />
      )}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <Card className="card-pad max-h-[90vh] w-full max-w-lg overflow-y-auto sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">{viewing.cycle}</h3>
              <button onClick={() => setViewing(null)} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              {viewing.score != null && (
                <p>
                  <Badge tone="green">Overall {viewing.score.toFixed(1)} / 5</Badge>
                </p>
              )}
              <div>
                <p className="text-xs font-medium text-ink-muted">Your self-assessment</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-ink">
                  {viewing.selfEvaluation || <i className="text-ink-faint">Not submitted.</i>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Manager evaluation</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-ink">
                  {viewing.managerEvaluation || <i className="text-ink-faint">None recorded.</i>}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewing(null)}>
                Close
              </Button>
              {!viewing.acknowledgedAt && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const next = await guard(() => acknowledgeReview(viewing.id));
                    if (next) {
                      onReviews(next);
                      setViewing(next.mine.find((m) => m.id === viewing.id) ?? null);
                    }
                  }}
                >
                  Acknowledge review
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/** Shared write modal for self-assessments and manager evaluations. */
function WriteEvaluationModal({
  title,
  prompts,
  context,
  submitLabel,
  withScore,
  onClose,
  onSubmit,
}: {
  title: string;
  prompts: string[];
  context?: { label: string; text: string };
  submitLabel: string;
  withScore: boolean;
  onClose: () => void;
  onSubmit: (text: string, score?: number) => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [score, setScore] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const parsed = score.trim() === "" ? undefined : Number(score);
      await onSubmit(text.trim(), parsed != null && !Number.isNaN(parsed) ? parsed : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <Card className="card-pad max-h-[90vh] w-full max-w-lg overflow-y-auto sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        {context && (
          <div className="mt-4">
            <p className="text-xs font-medium text-ink-muted">{context.label}</p>
            <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm text-ink">
              {context.text}
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-line bg-canvas/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            Consider covering
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-ink-muted">
            {prompts.map((p) => (
              <li key={p} className="flex gap-1.5">
                <span className="text-brand-500">•</span> {p}
              </li>
            ))}
          </ul>
        </div>

        <textarea
          className="field-input mt-4 min-h-40"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your assessment…"
        />

        {withScore && (
          <div className="mt-3">
            <label className="field-label">Proposed rating (0–5, optional — HR calibrates)</label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              className="field-input"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
        )}

        <p className="mt-3 text-xs text-ink-faint">
          Submitting locks your response and moves the review to the next stage.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!text.trim() || busy} onClick={submit}>
            {busy ? "Submitting…" : submitLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* =============================== 1-on-1s =============================== */

function SyncsTab({
  sync,
  viewerName,
  onChange,
  guard,
}: {
  sync: OneOnOneSync | null;
  viewerName: string;
  onChange: (s: OneOnOneSync) => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [pointText, setPointText] = React.useState("");
  const [itemText, setItemText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (!sync) {
    return (
      <Card className="card-pad">
        <div className="flex flex-col items-center py-10 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:text-brand-400">
            <CalendarClock className="h-6 w-6" />
          </span>
          <h2 className="text-base font-bold text-ink">No 1-on-1 scheduled</h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
            Recurring syncs with your manager will appear here, along with a shared agenda you can
            both add to before the meeting.
          </p>
        </div>
      </Card>
    );
  }

  const days = daysUntil(sync.scheduledAt);
  const past = days < 0;
  const doneCount = sync.actionItems.filter((i) => i.done).length;

  async function submitPoint() {
    const text = pointText.trim();
    if (!text) return;
    setBusy(true);
    const updated = await guard(() => addTalkingPoint(sync!.id, text));
    if (updated) {
      onChange(updated);
      setPointText("");
    }
    setBusy(false);
  }

  async function submitItem() {
    const text = itemText.trim();
    if (!text) return;
    setBusy(true);
    const updated = await guard(() => addActionItem(sync!.id, text));
    if (updated) {
      onChange(updated);
      setItemText("");
    }
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Upcoming sync */}
      <Card className="card-pad lg:col-span-12">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
            <CalendarClock className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">
              {past ? "Last sync" : "Next sync"} with {sync.managerName}
            </p>
            <p className="text-xs text-ink-muted">{syncTimeLabel(sync.scheduledAt)}</p>
          </div>
          {!past && (
            <Badge tone={days <= 2 ? "amber" : "brand"}>
              {days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}
            </Badge>
          )}
        </div>
      </Card>

      {/* Shared agenda */}
      <Card className="card-pad lg:col-span-7">
        <CardHeader
          title="Shared Agenda"
          action={
            <span className="text-[11px] text-ink-faint">
              Both you and {sync.managerName.split(" ")[0]} can add talking points
            </span>
          }
        />
        <div className="mt-3 space-y-2">
          {sync.talkingPoints.length === 0 && (
            <p className="text-sm text-ink-muted">
              No talking points yet — add what you want to cover.
            </p>
          )}
          {sync.talkingPoints.map((p) => {
            const mine = p.author === viewerName;
            return (
              <div key={p.id} className="flex items-start gap-3 rounded-xl bg-canvas px-3.5 py-2.5">
                <span
                  className={
                    mine
                      ? "mt-0.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-400"
                      : "mt-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300"
                  }
                >
                  {mine ? "You" : p.author.split(" ")[0]}
                </span>
                <p className="min-w-0 flex-1 text-sm text-ink-soft">{p.text}</p>
                {mine && (
                  <button
                    onClick={async () => {
                      const updated = await guard(() => removeTalkingPoint(sync.id, p.id));
                      if (updated) onChange(updated);
                    }}
                    title="Remove"
                    className="rounded p-1 text-ink-faint hover:bg-card hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={pointText}
            onChange={(e) => setPointText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPoint()}
            maxLength={500}
            placeholder="Add a talking point…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={submitPoint}
            disabled={busy || !pointText.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </Card>

      {/* Action items */}
      <Card className="card-pad lg:col-span-5">
        <CardHeader
          title="Action Items"
          action={
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
              <ListChecks className="h-3.5 w-3.5" /> {doneCount}/{sync.actionItems.length} done
            </span>
          }
        />
        <div className="mt-3 space-y-1.5">
          {sync.actionItems.length === 0 && (
            <p className="text-sm text-ink-muted">No action items from the last meeting.</p>
          )}
          {sync.actionItems.map((i) => (
            <label
              key={i.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas"
            >
              <input
                type="checkbox"
                checked={i.done}
                onChange={async (e) => {
                  const updated = await guard(() => toggleActionItem(sync.id, i.id, e.target.checked));
                  if (updated) onChange(updated);
                }}
                className="mt-0.5 h-4 w-4 rounded accent-brand-500"
              />
              <span
                className={
                  i.done ? "text-sm text-ink-faint line-through" : "text-sm text-ink-soft"
                }
              >
                {i.text}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={itemText}
            onChange={(e) => setItemText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitItem()}
            maxLength={500}
            placeholder="Add an action item…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={submitItem}
            disabled={busy || !itemText.trim()}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </Card>
    </div>
  );
}

/* =============================== Feedback ============================== */

function FeedbackTab({
  viewerName,
  colleagues,
  sent,
  inbox,
  kudos,
  onSent,
  onInbox,
  guard,
}: {
  viewerName: string;
  colleagues: Colleague[];
  sent: PeerFeedback[];
  inbox: PeerFeedback[];
  kudos: KudosItem[];
  onSent: (f: PeerFeedback[]) => void;
  onInbox: (f: PeerFeedback[]) => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [kudosOpen, setKudosOpen] = React.useState(false);
  const [reqForm, setReqForm] = React.useState({ colleagueId: "", topic: "", message: "" });
  const [kudosForm, setKudosForm] = React.useState({ toEmployeeId: "", message: "", emoji: "🎉" });
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [kudosSentNote, setKudosSentNote] = React.useState<string | null>(null);

  const pending = inbox.filter((f) => f.status === "Pending");

  async function submitRequest() {
    if (!reqForm.colleagueId || !reqForm.topic.trim()) return;
    setBusy(true);
    const next = await guard(() =>
      requestPeerFeedback({
        colleagueId: reqForm.colleagueId,
        topic: reqForm.topic.trim(),
        message: reqForm.message.trim() || undefined,
      }),
    );
    if (next) {
      onSent(next);
      setRequestOpen(false);
      setReqForm({ colleagueId: "", topic: "", message: "" });
    }
    setBusy(false);
  }

  async function submitResponse(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    setBusy(true);
    const next = await guard(() => respondPeerFeedback(id, text));
    if (next) onInbox(next);
    setBusy(false);
  }

  async function submitKudos() {
    if (!kudosForm.toEmployeeId || !kudosForm.message.trim()) return;
    setBusy(true);
    const created = await guard(() =>
      giveKudos({
        toEmployeeId: kudosForm.toEmployeeId,
        message: kudosForm.message.trim(),
        emoji: kudosForm.emoji,
      }),
    );
    if (created !== undefined) {
      const name = colleagues.find((c) => c.id === kudosForm.toEmployeeId)?.name ?? "your teammate";
      setKudosSentNote(`Kudos sent to ${name} — it will show up in their recognition feed.`);
      setKudosOpen(false);
      setKudosForm({ toEmployeeId: "", message: "", emoji: "🎉" });
    }
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left: requests */}
      <div className="space-y-5 lg:col-span-7">
        <Card className="card-pad">
          <CardHeader
            title="360° Feedback"
            action={
              <button
                onClick={() => setRequestOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              >
                <MessagesSquare className="h-3.5 w-3.5" /> Request Peer Feedback
              </button>
            }
          />
          <p className="mt-2 text-xs text-ink-muted">
            Ask a colleague for insights on a recent project — their response is shared with you
            and kept for your review cycle.
          </p>

          {pending.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                Awaiting your response ({pending.length})
              </p>
              <div className="mt-2 space-y-3">
                {pending.map((f) => (
                  <div key={f.id} className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 p-4">
                    <p className="text-sm font-semibold text-ink">
                      {f.requesterName} asked about: {f.topic}
                    </p>
                    {f.message && <p className="mt-1 text-xs text-ink-muted">“{f.message}”</p>}
                    <textarea
                      value={drafts[f.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                      rows={3}
                      maxLength={4000}
                      placeholder="Share what went well and one thing to try next time…"
                      className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => submitResponse(f.id)}
                        disabled={busy || !(drafts[f.id] ?? "").trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" /> Send feedback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              My requests
            </p>
            <div className="mt-2 space-y-3">
              {sent.length === 0 && (
                <p className="text-sm text-ink-muted">
                  You haven&apos;t asked anyone yet — feedback lands best right after a project
                  wraps.
                </p>
              )}
              {sent.map((f) => (
                <div key={f.id} className="rounded-xl border border-line/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{f.topic}</p>
                    <Badge tone={f.status === "Completed" ? "green" : "amber"}>
                      {f.status === "Completed" ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Asked {f.colleagueName} · {formatDate(f.createdAt.slice(0, 10))}
                  </p>
                  {f.response && (
                    <div className="mt-2 rounded-lg bg-canvas p-3">
                      <p className="whitespace-pre-wrap text-sm text-ink-soft">{f.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: kudos feed */}
      <div className="lg:col-span-5">
        <Card className="card-pad">
          <CardHeader
            title="Kudos"
            action={
              <button
                onClick={() => setKudosOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
              >
                <Trophy className="h-3.5 w-3.5" /> Give kudos
              </button>
            }
          />
          {kudosSentNote && (
            <p className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {kudosSentNote}
            </p>
          )}
          <div className="mt-3 space-y-3">
            {kudos.length === 0 && (
              <p className="text-sm text-ink-muted">
                Praise from teammates lands here — and stays on record for review cycles.
              </p>
            )}
            {kudos.map((k) => (
              <div key={k.id} className="flex items-start gap-3 rounded-xl bg-canvas p-3.5">
                <span className="text-xl leading-none">{k.emoji ?? "🎉"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-soft">{k.message}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {k.fromName ?? "A teammate"} · {formatDate(k.createdAt.slice(0, 10))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Request modal */}
      {requestOpen && (
        <Modal title="Request Peer Feedback" onClose={() => setRequestOpen(false)}>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Colleague
          </label>
          <select
            value={reqForm.colleagueId}
            onChange={(e) => setReqForm((f) => ({ ...f, colleagueId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Select a colleague…</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.title} ({c.department})
              </option>
            ))}
          </select>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            What should they weigh in on?
          </label>
          <input
            value={reqForm.topic}
            onChange={(e) => setReqForm((f) => ({ ...f, topic: e.target.value }))}
            maxLength={200}
            placeholder="e.g. Acme Corp renewal presentation"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Add context (optional)
          </label>
          <textarea
            value={reqForm.message}
            onChange={(e) => setReqForm((f) => ({ ...f, message: e.target.value }))}
            rows={3}
            maxLength={2000}
            placeholder="Anything specific you want their take on?"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setRequestOpen(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={submitRequest}
              disabled={busy || !reqForm.colleagueId || !reqForm.topic.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </Modal>
      )}

      {/* Kudos modal */}
      {kudosOpen && (
        <Modal title="Give kudos" onClose={() => setKudosOpen(false)}>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Teammate
          </label>
          <select
            value={kudosForm.toEmployeeId}
            onChange={(e) => setKudosForm((f) => ({ ...f, toEmployeeId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Select a teammate…</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.title}
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-1.5">
            {KUDOS_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => setKudosForm((f) => ({ ...f, emoji: e }))}
                className={
                  kudosForm.emoji === e
                    ? "rounded-lg border-2 border-brand-400 bg-brand-50 px-2.5 py-1.5 text-lg"
                    : "rounded-lg border border-line px-2.5 py-1.5 text-lg hover:bg-canvas"
                }
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            value={kudosForm.message}
            onChange={(e) => setKudosForm((f) => ({ ...f, message: e.target.value }))}
            rows={3}
            maxLength={500}
            placeholder={`What did they do that deserves a shout-out, ${viewerName.split(" ")[0]}?`}
            className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setKudosOpen(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={submitKudos}
              disabled={busy || !kudosForm.toEmployeeId || !kudosForm.message.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <Trophy className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Send kudos"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== Career Path ============================ */

function CareerTab({
  viewer,
  goals,
  goToFeedback,
}: {
  viewer: Viewer;
  goals: GrowthGoal[];
  goToFeedback: () => void;
}) {
  const target = nextRole(viewer.title);
  const completed = goals.filter((g) => g.status === "Completed").length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Ladder */}
      <Card className="card-pad lg:col-span-12">
        <CardHeader title="Your Path" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Current role
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{viewer.title}</p>
            <p className="text-xs text-ink-muted">{viewer.department}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-ink-faint" />
          <div className="flex-1 rounded-xl border border-dashed border-line p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              Next level
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{target}</p>
            <p className="text-xs text-ink-muted">
              Typical readiness: 12–18 months of consistent next-level evidence
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Promotions are decided in calibration with your manager and HR — this framework shows
          what the next level expects so there are no surprises.
        </p>
      </Card>

      {/* Competencies */}
      {COMPETENCIES.map((c) => (
        <Card key={c.name} className="card-pad lg:col-span-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{c.name}</p>
              <p className="mt-1 text-xs text-ink-soft">{c.nextLevel}</p>
              <p className="mt-2 text-[11px] text-ink-faint">
                <span className="font-semibold">Evidence to collect:</span> {c.evidence}
              </p>
            </div>
          </div>
        </Card>
      ))}

      {/* How to get there */}
      <Card className="card-pad bg-gradient-to-br from-violet-500 to-brand-600 text-white lg:col-span-6">
        <CheckCircle2 className="h-6 w-6" />
        <h3 className="mt-3 text-base font-bold">Build your case</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-white/85">
          <li>
            · {completed > 0 ? `${completed} goal${completed === 1 ? "" : "s"} completed` : "Complete your active goals"}{" "}
            — outcomes beat activity
          </li>
          <li>· Collect peer feedback right after projects wrap</li>
          <li>· Share knowledge: publish a course in Creator Studio</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={goToFeedback}
            className="rounded-xl bg-card px-4 py-2 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-white/90"
          >
            Request feedback
          </button>
          <a
            href="/employee/training"
            className="rounded-xl border border-white/40 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Browse training
          </a>
        </div>
      </Card>
    </div>
  );
}

/* ================================ Modal ================================ */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
