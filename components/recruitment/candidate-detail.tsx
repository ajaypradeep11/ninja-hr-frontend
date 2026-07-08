"use client";

import * as React from "react";
import {
  Bot,
  CheckCircle2,
  Circle,
  ClipboardList,
  Download,
  EyeOff,
  FileText,
  History,
  LayoutGrid,
  Lock,
  MessageSquare,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { AIReviewSummary } from "@/components/recruitment/ai-review-summary";
import { CommsCenter } from "@/components/recruitment/comms-center";
import { ResumeViewer } from "@/components/recruitment/resume-viewer";
import {
  addCandidateNote,
  purgeCandidate,
  setCandidateStageScoped,
} from "@/app/actions/recruitment";
import type {
  CandidateDetail,
  CommunicationTemplateEntry,
  RequisitionCandidate,
} from "@/lib/recruitment";
import { cn, formatDate } from "@/lib/utils";

const STAGES: RequisitionCandidate["stage"][] = [
  "Applied",
  "AI Screened",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const stageTone: Record<string, "gray" | "sky" | "brand" | "violet" | "green" | "red"> = {
  Applied: "gray",
  "AI Screened": "sky",
  Interview: "brand",
  Offer: "violet",
  Hired: "green",
  Rejected: "red",
};

const recTone: Record<string, "green" | "sky" | "amber" | "red"> = {
  "Strong Yes": "green",
  Yes: "sky",
  No: "amber",
  "Strong No": "red",
};

type TabKey = "overview" | "guide" | "panel" | "comms" | "activity";

const BASE_TABS: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  // "guide" is spliced in for interviewers (when a scorecard slot is provided).
  { key: "panel", label: "Interview Panel", icon: Users },
  { key: "comms", label: "AI Assistant & Comms", icon: Bot },
  { key: "activity", label: "Activity", icon: History },
];

export function CandidateDetailView({
  initial,
  templates,
  scorecardSlot,
  isHr = false,
}: {
  initial: CandidateDetail;
  templates: CommunicationTemplateEntry[];
  /** Panel scorecard-submission form (rendered when the viewer is a panelist). */
  scorecardSlot?: React.ReactNode;
  /** HR-only tools (manual comms, PII purge). */
  isHr?: boolean;
}) {
  const [candidate, setCandidate] = React.useState(initial);
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Internal-note state
  const [noteBody, setNoteBody] = React.useState("");

  // Privacy purge state (HR)
  const [confirmPurge, setConfirmPurge] = React.useState(false);

  /** Export all scorecards (ratings + notes + recommendations) as CSV. */
  function exportScorecards() {
    const rows: string[][] = [["Interviewer", "Status", "Recommendation", "Criterion", "Rating", "Notes"]];
    for (const s of candidate.scorecards) {
      if (s.ratings.length === 0) {
        rows.push([s.panelistName, s.status, s.recommendation, "", "", s.overallNotes ?? ""]);
      }
      for (const r of s.ratings) {
        rows.push([s.panelistName, s.status, s.recommendation, r.criterionName, String(r.rating), r.notes ?? ""]);
      }
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluations-${candidate.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitNote() {
    if (busy || !noteBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setCandidate(await addCandidateNote(candidate.id, noteBody.trim()));
      setNoteBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setBusy(false);
    }
  }

  async function purge() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setCandidate(await purgeCandidate(candidate.id));
      setConfirmPurge(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purge candidate data");
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(stage: RequisitionCandidate["stage"]) {
    if (busy || stage === candidate.stage) return;
    setBusy(true);
    setError(null);
    try {
      await setCandidateStageScoped(candidate.id, stage);
      setCandidate((prev) => ({ ...prev, stage }));
      // Refresh comms — a trigger may have fired.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change stage");
      setBusy(false);
    }
  }

  // Panel feedback: only Submitted cards are shared (the backend already
  // filters other people's drafts out of this list).
  const completedScorecards = candidate.scorecards.filter((s) => s.status === "Submitted");
  const myDraft = candidate.scorecards.find((s) => s.status === "Draft");
  // Debrief gating: a panelist sees the rest of the panel only after their own
  // submission (server-enforced — the data simply isn't in the payload before).
  const debriefLocked = candidate.viewerIsPanelMember && !candidate.viewerHasSubmitted && !isHr;

  // Interviewers (anyone handed a scorecard slot) get their own Interview
  // Guide tab; everyone else goes straight from Overview to Interview Panel.
  const tabs = React.useMemo(
    () =>
      scorecardSlot
        ? [
            BASE_TABS[0],
            { key: "guide" as TabKey, label: "Interview Guide", icon: NotebookPen },
            ...BASE_TABS.slice(1),
          ]
        : BASE_TABS,
    [scorecardSlot],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={candidate.name} size={48} />
            <div>
              <h1 className="text-xl font-bold text-ink">
                {candidate.name}
                {candidate.anonymized && <Badge tone="gray"> Redacted</Badge>}
              </h1>
              <p className="text-sm text-ink-muted">
                {candidate.requisitionTitle ?? candidate.role} · applied{" "}
                {formatDate(candidate.appliedDate)} · via {candidate.source}
                {candidate.email && <> · {candidate.email}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {candidate.blind && (
              <Badge tone="violet">
                <EyeOff className="mr-0.5 h-3 w-3" /> Blind hiring on
              </Badge>
            )}
            {candidate.withdrawn && <Badge tone="gray">Withdrawn</Badge>}
            <Badge tone={stageTone[candidate.stage]}>{candidate.stage}</Badge>
          </div>
        </div>

        {/* Stage control — an Admin (HR) action. Managers and panelists get a
            read-only pipeline; their input is the scorecard. */}
        {isHr ? (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
            {STAGES.map((s) => (
              <button
                key={s}
                disabled={busy || candidate.withdrawn}
                onClick={() => changeStage(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40",
                  s === candidate.stage
                    ? "bg-brand-500 text-white"
                    : "border border-line text-ink-soft hover:bg-canvas",
                )}
              >
                {s}
              </button>
            ))}
            <span className="ml-2 self-center text-[11px] text-ink-faint">
              Moving to Interview or Rejected automatically sends the matching template.
            </span>
          </div>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-[11px] text-ink-faint">
            Stage changes and hiring decisions are made by HR — share your evaluation in the
            Interview Guide tab.
          </p>
        )}
        {error && <p className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</p>}
      </Card>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          const badge =
            t.key === "panel"
              ? completedScorecards.length
              : t.key === "comms"
                ? candidate.communications.length
                : 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                on ? "bg-brand-500 text-white shadow-sm" : "border border-line bg-card text-ink-soft hover:bg-canvas",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {badge > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    on ? "bg-white/25" : "bg-canvas text-ink-muted",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------ Overview ------------------------------ */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            {/* Why the AI scored this application the way it did — no black box. */}
            <AIReviewSummary candidate={candidate} />

            {/* Pre-screen answers */}
            <Card className="card-pad">
              <CardHeader title="Pre-screening answers" action={<FileText className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
              <div className="mt-3 space-y-2.5">
                {candidate.answers.length === 0 && (
                  <p className="text-sm text-ink-muted">No pre-screening answers.</p>
                )}
                {candidate.answers.map((a, i) => (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <p className="text-xs font-semibold text-ink-soft">{a.question}</p>
                    <p className="mt-1 text-sm text-ink">{a.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            {/* Profile */}
            <Card className="card-pad">
              <CardHeader title="Profile" action={<UserRound className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />

              {/* Résumé + AI-parsed data */}
              {candidate.resume && (
                <div className="mt-3 rounded-xl border border-line p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                      <span className="truncate text-sm font-medium text-ink">
                        {candidate.resume.fileName ?? "Résumé"}
                      </span>
                    </span>
                  </div>
                  {/* In-app viewer — read the résumé without downloading it. */}
                  {!candidate.anonymized && (
                    <ResumeViewer candidateId={candidate.id} resume={candidate.resume} />
                  )}
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-faint">
                    <Sparkles className="h-3 w-3" />
                    {candidate.resume.parseStatus === "PARSED"
                      ? "AI-parsed"
                      : candidate.resume.parseStatus === "SKIPPED"
                        ? "Basic extraction (connect AI for full parsing)"
                        : "Parsing unavailable"}
                  </p>
                  {candidate.resume.phone && (
                    <p className="mt-2 text-xs text-ink-soft">
                      <span className="font-semibold">Phone:</span> {candidate.resume.phone}
                    </p>
                  )}
                  {candidate.resume.skills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Skills</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {candidate.resume.skills.map((s) => (
                          <span key={s} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-ink-soft">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {candidate.resume.workHistory.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Work history</p>
                      <ul className="mt-1 space-y-1">
                        {candidate.resume.workHistory.map((w, i) => (
                          <li key={i} className="text-xs text-ink-soft">
                            <span className="font-medium text-ink">{w.title}</span> · {w.company}
                            {w.dates && <span className="text-ink-faint"> · {w.dates}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {candidate.resumeText ? (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-canvas p-3.5 text-xs leading-relaxed text-ink-soft">
                  {candidate.resumeText}
                </p>
              ) : (
                !candidate.resume && <p className="mt-3 text-sm text-ink-muted">No résumé on file.</p>
              )}
              {candidate.consentAt && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Privacy consent {candidate.consentVersion} recorded{" "}
                  {formatDate(candidate.consentAt.slice(0, 10))}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------- Interview Panel --------------------------- */}
      {tab === "panel" && (
        <div className="space-y-5">
          <p className="flex items-start gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 px-4 py-3 text-xs text-violet-700 dark:text-violet-300">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Visibility rules:</span> every panelist fills in
              their own interview guide. Drafts are private to their author — a scorecard only
              appears here once its owner marks it <b>Completed</b>, and then it&apos;s read-only
              for everyone. This keeps first impressions from anchoring the panel.
            </span>
          </p>

          {/* Evaluation profile — aggregated KPIs + completed scorecards */}
          <Card className="card-pad border-violet-200 dark:border-violet-500/30 bg-violet-50/10 dark:bg-violet-500/10">
            <CardHeader
              title="Panel feedback & evaluation profile"
              action={
                <div className="flex items-center gap-2">
                  {completedScorecards.length > 0 && (
                    <button
                      onClick={exportScorecards}
                      className="inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-[11px] font-semibold text-ink-soft ring-1 ring-line hover:bg-canvas"
                    >
                      <Download className="h-3 w-3" /> Export CSV
                    </button>
                  )}
                  <ClipboardList className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                </div>
              }
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              <Lock className="h-3 w-3" /> Internal evaluation record — separate from the application, never shared with the candidate.
            </p>

            {/* Aggregate KPIs */}
            {candidate.evaluationSummary.submittedCount > 0 && (
              <div className="mt-3 rounded-xl border border-violet-100 dark:border-violet-500/30 bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-ink">
                      {candidate.evaluationSummary.averageOverall ?? "—"}
                      <span className="text-sm font-normal text-ink-faint">/5</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                      Avg across {candidate.evaluationSummary.submittedCount} interviewer(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.evaluationSummary.recommendationMix.map((m) => (
                      <Badge key={m.recommendation} tone={recTone[m.recommendation]}>
                        {m.count}× {m.recommendation}
                      </Badge>
                    ))}
                  </div>
                </div>
                {candidate.evaluationSummary.perCriterion.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {candidate.evaluationSummary.perCriterion.map((c) => (
                      <div key={c.criterionId} className="flex items-center gap-2 text-xs">
                        <span className="w-40 shrink-0 truncate text-ink-soft">{c.name}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-canvas">
                          <div
                            className="h-1.5 rounded-full bg-violet-400"
                            style={{ width: `${(c.average / 5) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-semibold text-ink">{c.average}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed scorecards — read-only for the whole panel */}
            <div className="mt-3 space-y-3">
              {debriefLocked ? (
                <div className="rounded-xl border border-dashed border-violet-200 dark:border-violet-500/30 bg-card px-4 py-6 text-center">
                  <Lock className="mx-auto h-5 w-5 text-violet-400" />
                  <p className="mt-2 text-sm font-semibold text-ink">
                    Panel feedback unlocks after you submit
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
                    To keep every evaluation independent, the other interviewers&apos; guides
                    stay hidden until you submit your own. Head to the{" "}
                    <button
                      onClick={() => setTab("guide")}
                      className="font-semibold text-violet-700 dark:text-violet-300 underline"
                    >
                      Interview Guide
                    </button>{" "}
                    tab to finish and submit it.
                  </p>
                </div>
              ) : (
                completedScorecards.length === 0 && (
                  <p className="text-sm text-ink-muted">
                    No completed scorecards yet — feedback appears here as panelists submit.
                  </p>
                )
              )}
              {completedScorecards.map((s) => {
                const avg = s.ratings.length
                  ? Math.round((s.ratings.reduce((sum, r) => sum + r.rating, 0) / s.ratings.length) * 10) / 10
                  : null;
                return (
                  <div key={s.id} className="rounded-xl border border-line bg-card p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.panelistName} size={26} />
                        <span className="text-sm font-medium text-ink">{s.panelistName}</span>
                        {avg !== null && (
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                            {avg}/5
                          </span>
                        )}
                      </div>
                      <Badge tone={recTone[s.recommendation]}>{s.recommendation}</Badge>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {s.ratings.map((r) => (
                        <div key={r.criterionId} className="flex items-center gap-2 text-xs">
                          <span className="w-40 shrink-0 truncate text-ink-soft">{r.criterionName}</span>
                          <span className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n}>
                                {n <= r.rating ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-line" />
                                )}
                              </span>
                            ))}
                          </span>
                          <span className="text-ink-faint">{r.rating}/5</span>
                          {r.notes && <span className="truncate text-ink-muted">— {r.notes}</span>}
                        </div>
                      ))}
                    </div>
                    {s.overallNotes && (
                      <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-xs text-ink-soft">
                        “{s.overallNotes}”
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pointer to the interviewer's own workspace */}
            {myDraft && (
              <button
                onClick={() => setTab("guide")}
                className="mt-3 w-full rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                You have a draft in progress — finish and submit it in the{" "}
                <span className="font-semibold underline">Interview Guide</span> tab.
              </button>
            )}
          </Card>
        </div>
      )}

      {/* ----------------------------- Interview Guide -------------------------- */}
      {tab === "guide" && scorecardSlot && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-700 dark:text-brand-400">
            <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Your interview workspace.</span> Take notes and
              rate each section while you interview — <b>Save</b> keeps a private draft you can
              keep editing, <b>Submit</b> locks it and shares it with the panel under the
              Interview Panel tab.
            </span>
          </p>
          <Card className="card-pad !pt-1">{scorecardSlot}</Card>
        </div>
      )}

      {/* -------------------------- AI Assistant & Comms ------------------------ */}
      {tab === "comms" && (
        <CommsCenter
          candidate={candidate}
          templates={templates}
          isHr={isHr}
          onUpdated={setCandidate}
        />
      )}

      {/* -------------------------------- Activity ------------------------------ */}
      {tab === "activity" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Internal evaluation notes — strictly internal, RBAC'd. */}
          <Card className="card-pad border-violet-200 dark:border-violet-500/30 bg-violet-50/20 dark:bg-violet-500/10">
            <CardHeader
              title="Internal notes"
              action={<Lock className="h-4 w-4 text-violet-500 dark:text-violet-400" />}
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              <Lock className="h-3 w-3" /> Internal — hiring team only, never shared with the candidate.
            </p>
            <div className="mt-3">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                placeholder="Add an interview impression or internal note…"
                className="field-input resize-none"
              />
              <button
                disabled={busy || !noteBody.trim()}
                onClick={submitNote}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-50"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Add note
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {candidate.notes.length === 0 && (
                <p className="text-sm text-ink-muted">No internal notes yet.</p>
              )}
              {candidate.notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-violet-100 dark:border-violet-500/30 bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <Avatar name={n.authorName ?? "?"} size={20} /> {n.authorName ?? "Unknown"}
                    </span>
                    <span className="text-[11px] text-ink-faint">{formatDate(n.createdAt.slice(0, 10))}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-soft">{n.body}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            {/* Audit trail */}
            <Card className="card-pad">
              <CardHeader title="Audit trail" />
              <div className="mt-3 space-y-1.5">
                {candidate.auditTrail.length === 0 && (
                  <p className="text-sm text-ink-muted">No events recorded.</p>
                )}
                {candidate.auditTrail.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span className="text-ink-soft">
                      <b>{e.event}</b>
                      {e.detail && <> — {e.detail}</>}
                      <span className="ml-1 text-ink-faint">{formatDate(e.at.slice(0, 10))}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Privacy tools (HR) */}
            {isHr && !candidate.anonymized && (
              <Card className="card-pad border-red-200 dark:border-red-500/30 bg-red-50/20 dark:bg-red-500/10">
                <CardHeader title="Data privacy (Ontario compliance)" />
                <p className="mt-2 text-xs text-ink-muted">
                  Permanently anonymize this candidate&apos;s personal data: name, email, resume,
                  pre-screen answers and message contents are redacted; the tracking link stops
                  working. The anonymized funnel record is kept for analytics and the action is
                  written to the audit trail.
                </p>
                {confirmPurge ? (
                  <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 p-3.5">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Purge all personal data for {candidate.name}?
                    </p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">This cannot be undone.</p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        disabled={busy}
                        onClick={purge}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {busy ? "Purging…" : "Yes, purge PII"}
                      </button>
                      <button
                        onClick={() => setConfirmPurge(false)}
                        className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmPurge(true)}
                    className="mt-3 rounded-xl border border-red-300 bg-card px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-300 transition hover:bg-red-50 dark:hover:bg-red-500/20"
                  >
                    Purge personal data…
                  </button>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
