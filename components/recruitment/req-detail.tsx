"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  EyeOff,
  Globe,
  Info,
  Linkedin,
  Pencil,
  Plus,
  Rocket,
  Send,
  ShieldCheck,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { validateJobDescription } from "@/lib/compliance";
import { getGuideTemplate } from "@/app/actions/recruitment";
import {
  decideRequisition,
  generateJd,
  publishRequisitionById,
  setCostOfHire,
  setScorecardCriteria,
  submitRequisition,
  updatePublishing,
} from "@/app/actions/recruitment";
import { REQ_STATUS_FLOW, type RequisitionDetail } from "@/lib/recruitment";
import { checkInclusiveLanguage } from "@/lib/inclusive-language";
import { InclusiveFlags } from "@/components/recruitment/inclusive-flags";
import { cn, formatDate } from "@/lib/utils";

const statusTone: Record<string, "gray" | "amber" | "sky" | "green"> = {
  Draft: "gray",
  "Pending Approval": "amber",
  Approved: "sky",
  Published: "green",
};

export function ReqDetail({
  initial,
  actorEmployeeId,
  isHr,
  basePath,
  companySlug,
}: {
  initial: RequisitionDetail;
  actorEmployeeId: string;
  isHr: boolean;
  basePath: string;
  /** The tenant's careers slug — the public posting lives at /careers/<slug>/<req.slug>. */
  companySlug: string | null;
}) {
  const [req, setReq] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Publishing panel state (HR)
  const [jd, setJd] = React.useState(initial.jd ?? "");
  const [questions, setQuestions] = React.useState(
    initial.preScreenQuestions.map((q) => ({ question: q.question, required: q.required })),
  );
  const [newQuestion, setNewQuestion] = React.useState("");
  const [indeed, setIndeed] = React.useState(initial.indeedEnabled);
  const [linkedin, setLinkedin] = React.useState(initial.linkedinEnabled);
  const [blind, setBlind] = React.useState(initial.blindHiring);
  const [generatingJd, setGeneratingJd] = React.useState(false);
  const inclusiveFlags = React.useMemo(() => checkInclusiveLanguage(jd), [jd]);

  // Decision state (approvers)
  const [comment, setComment] = React.useState("");

  const stageIdx = REQ_STATUS_FLOW.indexOf(req.status);
  const myApproval = req.approvals.find((a) => a.approverId === actorEmployeeId);
  const canDecide = req.status === "Pending Approval" && myApproval?.decision === "Pending";
  const isCreator = req.createdById === actorEmployeeId;
  const canSubmit = req.status === "Draft" && (isCreator || isHr);
  // Editable at any stage until the first application lands.
  const canEdit = req.applicants === 0 && (isCreator || isHr);

  const issues = React.useMemo(
    () =>
      validateJobDescription({
        province: req.province,
        salaryMin: req.salaryMin,
        salaryMax: req.salaryMax,
        body: jd,
      }),
    [req.province, req.salaryMin, req.salaryMax, jd],
  );
  const hasComplianceError = issues.some((i) => i.level === "error");

  async function run(fn: () => Promise<RequisitionDetail>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setReq(updated);
      setJd(updated.jd ?? "");
      setQuestions(updated.preScreenQuestions.map((q) => ({ question: q.question, required: q.required })));
      setIndeed(updated.indeedEnabled);
      setLinkedin(updated.linkedinEnabled);
      setBlind(updated.blindHiring);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">{req.title}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {req.department} · {req.province} · {req.type} · $
            {req.salaryMin.toLocaleString()}–${req.salaryMax.toLocaleString()}
            {req.createdByName && <> · opened by {req.createdByName}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`${basePath}/${req.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-canvas"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
          <Badge tone={statusTone[req.status]}>{req.status}</Badge>
        </div>
      </div>

      {/* Status pipeline */}
      <Card className="card-pad">
        <div className="flex items-center">
          {REQ_STATUS_FLOW.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                {i <= stageIdx ? (
                  <CheckCircle2 className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                ) : (
                  <Circle className="h-5 w-5 text-line" />
                )}
                <span className={cn("mt-1.5 text-[11px] font-medium", i <= stageIdx ? "text-ink" : "text-ink-faint")}>
                  {s}
                </span>
              </div>
              {i < REQ_STATUS_FLOW.length - 1 && (
                <div className={cn("mx-3 h-0.5 flex-1", i < stageIdx ? "bg-brand-500" : "bg-line")} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {req.status === "Draft" && req.rejectionFeedback && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Returned with feedback:</b> {req.rejectionFeedback}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Approvals */}
        <Card className="card-pad">
          <CardHeader title={`Approvals (${req.approvals.filter((a) => a.decision === "Approved").length}/${req.approvals.length})`} />
          <div className="mt-3 space-y-2.5">
            {req.approvals.map((a) => (
              <div key={a.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={a.approverName} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{a.approverName}</p>
                    <p className="truncate text-[11px] text-ink-muted">{a.approverTitle}</p>
                  </div>
                  <Badge tone={a.decision === "Approved" ? "green" : a.decision === "Rejected" ? "red" : "amber"}>
                    {a.decision}
                  </Badge>
                </div>
                {a.comment && (
                  <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-xs text-ink-soft">
                    “{a.comment}”
                  </p>
                )}
              </div>
            ))}
            {req.approvals.length === 0 && (
              <p className="text-sm text-ink-muted">No approvers assigned.</p>
            )}
          </div>

          {canDecide && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5">
              <p className="text-xs font-semibold text-ink">Your decision is requested</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Comment (required when rejecting)"
                className="field-input mt-2 resize-none"
              />
              <div className="mt-2.5 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => run(() => decideRequisition(req.id, "Approved", comment.trim() || undefined))}
                  className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <CheckCircle2 className="mr-1 inline h-4 w-4" /> Approve
                </button>
                <button
                  disabled={busy || !comment.trim()}
                  onClick={() => run(() => decideRequisition(req.id, "Rejected", comment.trim()))}
                  className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  <XCircle className="mr-1 inline h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          )}

          {canSubmit && (
            <button
              disabled={busy || req.approvals.length === 0}
              onClick={() => run(() => submitRequisition(req.id))}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Submit for Approval
            </button>
          )}
        </Card>

        {/* Hiring team */}
        <Card className="card-pad">
          <CardHeader title="Hiring team" />
          <p className="mt-1 text-xs text-ink-muted">
            Team members see candidate applications; panel members submit interview scorecards.
          </p>
          <div className="mt-3 space-y-2">
            {req.hiringTeam.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
                <Avatar name={m.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{m.title}</p>
                </div>
                {m.isPanelMember && <Badge tone="violet">Interview panel</Badge>}
              </div>
            ))}
            {req.hiringTeam.length === 0 && <p className="text-sm text-ink-muted">No hiring team yet.</p>}
          </div>
          <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-xs text-ink-muted">
            {req.applicants} application{req.applicants === 1 ? "" : "s"} received so far.
          </p>
        </Card>
      </div>

      {/* HR publishing panel */}
      {isHr && (req.status === "Approved" || req.status === "Published") && (
        <Card className="card-pad border-brand-200">
          <CardHeader
            title={req.status === "Published" ? "Published posting" : "Publish (HR)"}
            action={<ShieldCheck className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
          />
          {req.status === "Published" ? (
            <div className="mt-3 space-y-2 text-sm">
              {companySlug && (
                <p className="flex items-center gap-2 text-ink-soft">
                  <Globe className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                  Careers page:{" "}
                  <Link href={`/careers/${companySlug}/${req.slug}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline" target="_blank">
                    /careers/{companySlug}/{req.slug}
                  </Link>
                </p>
              )}
              {req.indeedUrl && (
                <p className="flex items-center gap-2 text-ink-soft">
                  <ExternalLink className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Indeed:{" "}
                  <span className="truncate font-mono text-xs text-ink-muted">{req.indeedUrl}</span>
                </p>
              )}
              {req.linkedinUrl && (
                <p className="flex items-center gap-2 text-ink-soft">
                  <Linkedin className="h-4 w-4 text-sky-600 dark:text-sky-300" /> LinkedIn:{" "}
                  <span className="truncate font-mono text-xs text-ink-muted">{req.linkedinUrl}</span>
                </p>
              )}
              <p className="text-xs text-ink-faint">
                Published {req.publishedAt ? formatDate(req.publishedAt.slice(0, 10)) : ""}. It also
                appears on the internal job board.
              </p>
              <CostField
                requisitionId={req.id}
                initial={req.costOfHire}
                onSaved={(updated) => setReq(updated)}
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label">Job description (required to publish)</label>
                  <button
                    onClick={async () => {
                      if (generatingJd) return;
                      setGeneratingJd(true);
                      try {
                        const res = await generateJd({
                          title: req.title,
                          department: req.department,
                          province: req.province,
                          type: req.type,
                          salaryMin: req.salaryMin,
                          salaryMax: req.salaryMax,
                          keyPoints: jd,
                        });
                        setJd(res.jd); // saved when HR clicks "Save details"
                      } finally {
                        setGeneratingJd(false);
                      }
                    }}
                    disabled={generatingJd}
                    className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100 disabled:opacity-50"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> {generatingJd ? "Generating…" : "Generate with AI"}
                  </button>
                </div>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={14}
                  className="w-full rounded-xl border border-line bg-canvas/40 p-3 font-mono text-[12px] leading-relaxed text-ink-soft outline-none focus:border-brand-300 focus:bg-card"
                  placeholder="Paste or write the JD here…"
                />
                <div className="mt-2 space-y-1.5">
                  {issues.map((iss, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                        iss.level === "error" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300" : iss.level === "warning" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
                      )}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {iss.message}
                    </div>
                  ))}
                  {issues.length === 0 && jd && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> No compliance issues for {req.province}.
                    </div>
                  )}
                  <InclusiveFlags flags={inclusiveFlags} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="field-label">Pre-screening questions</label>
                  <div className="space-y-1.5">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{q.question}</span>
                        <label className="flex shrink-0 items-center gap-1 text-[11px] text-ink-muted">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={() =>
                              setQuestions((prev) => prev.map((x, j) => (j === i ? { ...x, required: !x.required } : x)))
                            }
                            className="h-3.5 w-3.5 rounded border-line text-brand-500 dark:text-brand-400"
                          />
                          Required
                        </label>
                        <button
                          onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))}
                          className="text-ink-faint hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newQuestion.trim()) {
                          setQuestions((prev) => [...prev, { question: newQuestion.trim(), required: true }]);
                          setNewQuestion("");
                        }
                      }}
                      className="field-input flex-1"
                      placeholder="e.g. Are you legally entitled to work in Canada?"
                    />
                    <button
                      onClick={() => {
                        if (!newQuestion.trim()) return;
                        setQuestions((prev) => [...prev, { question: newQuestion.trim(), required: true }]);
                        setNewQuestion("");
                      }}
                      className="rounded-xl bg-brand-500 px-3 text-white hover:bg-brand-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="field-label">Job boards</label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm text-ink-soft">
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Indeed (deep-link to posting)
                      </span>
                      <input type="checkbox" checked={indeed} onChange={(e) => setIndeed(e.target.checked)} className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400" />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm text-ink-soft">
                      <span className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-sky-600 dark:text-sky-300" /> LinkedIn (deep-link to posting)
                      </span>
                      <input type="checkbox" checked={linkedin} onChange={(e) => setLinkedin(e.target.checked)} className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400" />
                    </label>
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    Simulated integrations — real Indeed/LinkedIn APIs can be connected later; both
                    link back to the public careers posting.
                  </p>
                </div>

                <div>
                  <label className="field-label">Bias controls</label>
                  <label className="flex items-center justify-between rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-500/10 px-3 py-2.5 text-sm text-ink-soft">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-violet-500 dark:text-violet-400" /> Blind Hiring for the panel
                    </span>
                    <input
                      type="checkbox"
                      checked={blind}
                      onChange={(e) => setBlind(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-violet-500 dark:text-violet-400"
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    When on, the hiring manager and panel see “Candidate #n” instead of names —
                    identities, contact details and résumé files are scrubbed server-side. HR
                    always sees the full record.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        updatePublishing(req.id, {
                          jd,
                          preScreenQuestions: questions,
                          indeedEnabled: indeed,
                          linkedinEnabled: linkedin,
                          blindHiring: blind,
                        }),
                      )
                    }
                    className="flex-1 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
                  >
                    Save details
                  </button>
                  <button
                    disabled={busy || !jd.trim() || hasComplianceError}
                    onClick={() =>
                      run(async () => {
                        await updatePublishing(req.id, {
                          jd,
                          preScreenQuestions: questions,
                          indeedEnabled: indeed,
                          linkedinEnabled: linkedin,
                          blindHiring: blind,
                        });
                        return publishRequisitionById(req.id);
                      })
                    }
                    className="flex-1 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Rocket className="mr-1 inline h-4 w-4" /> {busy ? "Publishing…" : "Publish"}
                  </button>
                </div>
                {hasComplianceError && (
                  <p className="text-center text-[11px] font-semibold text-red-500 dark:text-red-400">
                    {!req.salaryMin || !req.salaryMax
                      ? "Cannot publish: Bill 149 requires a posted salary range."
                      : "Resolve compliance errors before publishing."}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {!isHr && req.status === "Approved" && (
        <Card className="card-pad">
          <p className="text-sm text-ink-muted">
            <ShieldCheck className="mr-1.5 inline h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            All approvals received — HR is preparing the job description and posting details.
          </p>
        </Card>
      )}

      {/* Scorecard criteria (HR or creator) */}
      {(isHr || isCreator) && (
        <CriteriaEditor
          requisitionId={req.id}
          initial={req.scorecardCriteria}
          onSaved={(updated) => setReq(updated)}
        />
      )}
    </div>
  );
}

function CostField({
  requisitionId,
  initial,
  onSaved,
}: {
  requisitionId: string;
  initial?: number;
  onSaved: (detail: RequisitionDetail) => void;
}) {
  const [cost, setCost] = React.useState(initial != null ? String(initial) : "");
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    const value = Number(cost);
    if (busy || !cost || Number.isNaN(value) || value < 0) return;
    setBusy(true);
    try {
      onSaved(await setCostOfHire(requisitionId, Math.round(value)));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <label className="field-label">Recruiting spend (for cost-per-hire analytics)</label>
      <div className="flex gap-2">
        <input
          value={cost}
          onChange={(e) => {
            setCost(e.target.value);
            setSaved(false);
          }}
          className="field-input w-40"
          placeholder="e.g. 8500"
          inputMode="numeric"
        />
        <button
          disabled={busy}
          onClick={save}
          className="rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50"
        >
          {busy ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}

function CriteriaEditor({
  requisitionId,
  initial,
  onSaved,
}: {
  requisitionId: string;
  initial: RequisitionDetail["scorecardCriteria"];
  onSaved: (detail: RequisitionDetail) => void;
}) {
  const [criteria, setCriteria] = React.useState(
    initial.map((c) => ({ name: c.name, weight: c.weight, guidance: c.guidance })),
  );
  const [newName, setNewName] = React.useState("");
  const [newWeight, setNewWeight] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  /** Pull the company's CURRENT standard guide into this requisition. */
  async function loadStandard() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const template = await getGuideTemplate();
      setCriteria(template.map((s) => ({ name: s.name, weight: s.weight, guidance: s.guidance })));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the standard guide");
    } finally {
      setBusy(false);
    }
  }

  function add() {
    if (!newName.trim()) return;
    setCriteria((prev) => [
      ...prev,
      { name: newName.trim(), weight: newWeight ? Number(newWeight) : undefined, guidance: undefined },
    ]);
    setNewName("");
    setNewWeight("");
    setSaved(false);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await setScorecardCriteria(requisitionId, criteria));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save criteria");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-pad">
      <CardHeader title="Interview scorecard criteria" />
      <p className="mt-1 text-xs text-ink-muted">
        Structured criteria keep panel feedback consistent and measurable — every panelist rates
        the same dimensions, reducing bias.
      </p>
      <div className="mt-3 space-y-1.5">
        {criteria.map((c, i) => (
          <div key={i} className="rounded-xl border border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{c.name}</span>
              {c.weight != null && (
                <span className="shrink-0 text-[11px] text-ink-faint">weight {c.weight}</span>
              )}
              <button
                onClick={() => {
                  setCriteria((prev) => prev.filter((_, j) => j !== i));
                  setSaved(false);
                }}
                className="text-ink-faint hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={c.guidance ?? ""}
              onChange={(e) => {
                const guidance = e.target.value;
                setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, guidance } : x)));
                setSaved(false);
              }}
              rows={2}
              placeholder="Guiding questions for interviewers — one per line (optional)"
              className="field-input mt-1.5 resize-y text-xs leading-relaxed"
            />
          </div>
        ))}
        {criteria.length === 0 && (
          <p className="text-sm text-ink-muted">No criteria yet — add a few before interviews start.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="field-input flex-1"
          placeholder="e.g. Technical depth"
        />
        <input
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          className="field-input w-24"
          placeholder="Weight"
          inputMode="numeric"
        />
        <button onClick={add} className="rounded-xl bg-brand-500 px-3 text-white hover:bg-brand-600">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          onClick={loadStandard}
          title="Replace these criteria with the company's current Standard Interview Guide"
          className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
        >
          Load standard guide
        </button>
        <button
          disabled={busy}
          onClick={save}
          className="rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
        >
          {busy ? "Saving…" : saved ? "Saved ✓" : "Save criteria"}
        </button>
      </div>
    </Card>
  );
}
