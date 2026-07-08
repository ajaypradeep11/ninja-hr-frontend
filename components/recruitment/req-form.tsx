"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, Users, Wand2 } from "lucide-react";
import { Card, CardHeader, Avatar } from "@/components/ui";
import type { ProvinceCode } from "@/lib/compliance";
import { createRequisition, generateJd, submitRequisition, updateRequisition } from "@/app/actions/recruitment";
import type { EmploymentType, RequisitionDetail } from "@/lib/recruitment";
import { checkInclusiveLanguage } from "@/lib/inclusive-language";
import { InclusiveFlags } from "@/components/recruitment/inclusive-flags";
import { cn } from "@/lib/utils";

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Finance", "Marketing", "People", "Operations"];
const TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contractor"];

export interface PersonOption {
  employeeId: string;
  name: string;
  title: string;
  department: string;
}

function buildJD(input: {
  title: string;
  dept: string;
  type: string;
  province: ProvinceCode;
  reqs: string;
  salaryMin: string;
  salaryMax: string;
}) {
  const reqList = input.reqs
    .split(/\n|,/)
    .map((r) => r.trim())
    .filter(Boolean);
  return `Company Overview
We're a fast-growing Canadian technology company building agentic software that helps teams do their best work. We're proud of our inclusive, remote-friendly culture.

Role: ${input.title || "[Job Title]"} (${input.type})
Department: ${input.dept || "[Department]"} · Location: ${input.province}

Responsibilities
• Own and deliver ${input.dept || "team"} initiatives end-to-end.
• Collaborate cross-functionally to ship high-quality outcomes.
• Mentor peers and raise the bar for craft and execution.

Qualifications
${reqList.length ? reqList.map((r) => `• ${r}`).join("\n") : "• [Add key requirements]"}

Perks & Compensation
• Competitive salary${input.salaryMin && input.salaryMax ? ` ($${Number(input.salaryMin).toLocaleString()} – $${Number(input.salaryMax).toLocaleString()} CAD)` : ""}.
• Comprehensive health & dental benefits and an RRSP match.
• Flexible time off and a yearly learning budget.`;
}

export function ReqForm({
  approverOptions,
  teamOptions,
  selfEmployeeId,
  lockedDepartment,
  showJdBuilder,
  basePath,
  edit,
}: {
  /** Managers eligible to approve (self excluded). */
  approverOptions: PersonOption[];
  /** Everyone who can be on the hiring team. */
  teamOptions: PersonOption[];
  selfEmployeeId: string;
  /** Managers are locked to their own department; HR picks freely. */
  lockedDepartment?: string;
  /** HR can draft the JD now; managers leave it to HR at the publish step. */
  showJdBuilder: boolean;
  basePath: string;
  /** Present in edit mode — pre-fills the form and switches Create → Save. */
  edit?: RequisitionDetail;
}) {
  const router = useRouter();
  const isEdit = !!edit;
  // Approvers are tied to live decisions once out of Draft — lock them then.
  const lockApprovers = isEdit && edit.status !== "Draft";

  const [title, setTitle] = React.useState(edit?.title ?? "");
  const [dept, setDept] = React.useState(edit?.department ?? lockedDepartment ?? "");
  const [type, setType] = React.useState<EmploymentType>(edit?.type ?? "Full-time");
  // The platform is strictly Ontario-scoped — the backend rejects anything else,
  // so the form doesn't offer a choice. (Legacy non-ON drafts convert on save.)
  const province: ProvinceCode = "ON";
  const [salaryMin, setSalaryMin] = React.useState(edit ? String(edit.salaryMin) : "");
  const [salaryMax, setSalaryMax] = React.useState(edit ? String(edit.salaryMax) : "");
  const [reqs, setReqs] = React.useState("");
  const [jd, setJd] = React.useState(edit?.jd ?? "");
  const [approvers, setApprovers] = React.useState<string[]>(
    edit?.approvals.map((a) => a.approverId) ?? [],
  );
  const [team, setTeam] = React.useState<Record<string, { selected: boolean; panel: boolean }>>(
    Object.fromEntries(
      (edit?.hiringTeam ?? []).map((m) => [m.employeeId, { selected: true, panel: m.isPanelMember }]),
    ),
  );
  const [saving, setSaving] = React.useState<null | "draft" | "submit">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  const inclusiveFlags = React.useMemo(() => checkInclusiveLanguage(jd), [jd]);

  async function runGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await generateJd({
        title,
        department: dept,
        province,
        type,
        salaryMin: Number(salaryMin) || 0,
        salaryMax: Number(salaryMax) || 0,
        keyPoints: reqs,
      });
      setJd(res.jd);
    } catch {
      // Fall back to the local template if the endpoint is unreachable.
      setJd(buildJD({ title, dept, type, province, reqs, salaryMin, salaryMax }));
    } finally {
      setGenerating(false);
    }
  }

  const valid =
    title.trim() &&
    dept &&
    Number(salaryMin) > 0 &&
    Number(salaryMax) >= Number(salaryMin) &&
    // Approvers are required to create or submit a Draft, but not to save an
    // edit to an already-submitted requisition (its approvers are locked).
    (lockApprovers || approvers.length > 0);

  function toggleApprover(id: string) {
    setApprovers((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function toggleTeam(id: string) {
    setTeam((prev) => ({
      ...prev,
      [id]: { selected: !prev[id]?.selected, panel: prev[id]?.panel ?? false },
    }));
  }

  function togglePanel(id: string) {
    setTeam((prev) => ({
      ...prev,
      [id]: { selected: prev[id]?.selected ?? true, panel: !prev[id]?.panel },
    }));
  }

  async function save(submitAfter: boolean) {
    if (!valid || saving) return;
    setSaving(submitAfter ? "submit" : "draft");
    setError(null);
    const payload = {
      title: title.trim(),
      department: dept,
      province,
      type,
      salaryMin: Number(salaryMin),
      salaryMax: Number(salaryMax),
      jd: jd.trim() || undefined,
      // When approvers are locked, resend the existing set so the DTO stays valid.
      approverIds: approvers,
      hiringTeam: Object.entries(team)
        .filter(([, v]) => v.selected)
        .map(([employeeId, v]) => ({ employeeId, isPanelMember: v.panel })),
    };
    try {
      if (isEdit) {
        await updateRequisition(edit.id, payload);
        router.push(`${basePath}/${edit.id}`);
        router.refresh();
      } else {
        const detail = await createRequisition(payload);
        if (submitAfter) await submitRequisition(detail.id);
        router.push(`${basePath}/${detail.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save requisition");
      setSaving(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Basics */}
      <div className="space-y-5">
        <Card className="card-pad sm:p-6">
          <CardHeader title="Requisition details" />
          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label">Job title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" placeholder="Senior Software Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Department</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="field-input disabled:bg-canvas disabled:text-ink-muted"
                  disabled={!!lockedDepartment}
                >
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                  {lockedDepartment && !DEPARTMENTS.includes(lockedDepartment) && (
                    <option>{lockedDepartment}</option>
                  )}
                </select>
                {lockedDepartment && (
                  <p className="mt-1 text-[11px] text-ink-faint">Locked to your department.</p>
                )}
              </div>
              <div>
                <label className="field-label">Employment type</label>
                <select value={type} onChange={(e) => setType(e.target.value as EmploymentType)} className="field-input">
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Location / Province</label>
              <input
                value="Ontario (ON)"
                readOnly
                disabled
                aria-label="Location is fixed to Ontario"
                className="field-input bg-canvas text-ink-muted"
              />
              <p className="mt-1 text-[11px] text-ink-faint">
                All postings are Ontario-based — Bill 149 salary-transparency rules apply.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Target salary — min</label>
                <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="field-input" placeholder="130000" inputMode="numeric" />
              </div>
              <div>
                <label className="field-label">Target salary — max</label>
                <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="field-input" placeholder="165000" inputMode="numeric" />
              </div>
            </div>
          </div>
        </Card>

        {showJdBuilder && (
          <Card className="card-pad sm:p-6">
            <CardHeader title="Job description (optional at draft)" action={<Wand2 className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 space-y-3">
              <textarea
                value={reqs}
                onChange={(e) => setReqs(e.target.value)}
                rows={3}
                className="field-input resize-none"
                placeholder={"Key requirements — one per line\n5+ years TypeScript\nLed a team"}
              />
              <button
                onClick={runGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100 disabled:opacity-50"
              >
                <Wand2 className="h-3.5 w-3.5" /> {generating ? "Generating…" : "Generate with AI"}
              </button>
              {jd && (
                <>
                  <textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-line bg-canvas/40 p-3 font-mono text-[12px] leading-relaxed text-ink-soft outline-none focus:border-brand-300 focus:bg-card"
                  />
                  <InclusiveFlags flags={inclusiveFlags} />
                </>
              )}
            </div>
          </Card>
        )}
        {!showJdBuilder && (
          <Card className="card-pad">
            <p className="text-xs text-ink-muted">
              No job description needed at this stage — HR adds the JD and pre-screening questions
              after your requisition is approved.
            </p>
          </Card>
        )}
      </div>

      {/* Approvers + hiring team */}
      <div className="space-y-5">
        <Card className="card-pad sm:p-6">
          <CardHeader title="Approvers" action={<Send className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
          <p className="mt-1 text-xs text-ink-muted">
            {lockApprovers
              ? "Approvers are locked once the requisition has been submitted for approval."
              : "Every selected manager must approve before the position moves to HR for publishing."}
          </p>
          <div className="mt-3 space-y-1.5">
            {approverOptions.length === 0 && (
              <p className="text-sm text-ink-muted">No eligible approvers found.</p>
            )}
            {approverOptions.map((p) => {
              const on = approvers.includes(p.employeeId);
              return (
                <button
                  key={p.employeeId}
                  disabled={lockApprovers}
                  onClick={() => toggleApprover(p.employeeId)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition disabled:opacity-50",
                    on ? "border-brand-300 bg-brand-50/60" : "border-line hover:bg-canvas",
                  )}
                >
                  <Avatar name={p.name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {p.title} · {p.department}
                    </span>
                  </span>
                  {on && <CheckCircle2 className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="card-pad sm:p-6">
          <CardHeader title="Hiring team" action={<Users className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
          <p className="mt-1 text-xs text-ink-muted">
            Team members can view candidate applications. Panel members also submit interview
            scorecards.
          </p>
          <div className="mt-3 space-y-1.5">
            {teamOptions
              .filter((p) => p.employeeId !== selfEmployeeId)
              .map((p) => {
                const entry = team[p.employeeId];
                const on = entry?.selected ?? false;
                return (
                  <div
                    key={p.employeeId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition",
                      on ? "border-brand-300 bg-brand-50/40" : "border-line",
                    )}
                  >
                    <button onClick={() => toggleTeam(p.employeeId)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <Avatar name={p.name} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-[11px] text-ink-muted">
                          {p.title} · {p.department}
                        </span>
                      </span>
                      {on && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />}
                    </button>
                    {on && (
                      <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-ink-soft">
                        <input
                          type="checkbox"
                          checked={entry?.panel ?? false}
                          onChange={() => togglePanel(p.employeeId)}
                          className="h-3.5 w-3.5 rounded border-line text-brand-500 dark:text-brand-400"
                        />
                        Interview panel
                      </label>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>

        {error && (
          <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</p>
        )}

        {isEdit ? (
          <button
            disabled={!valid || saving !== null}
            onClick={() => save(false)}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              disabled={!valid || saving !== null}
              onClick={() => save(false)}
              className="flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving === "draft" ? "Saving…" : "Save as Draft"}
            </button>
            <button
              disabled={!valid || saving !== null}
              onClick={() => save(true)}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving === "submit" ? "Submitting…" : "Submit for Approval"}
            </button>
          </div>
        )}
        {!valid && (
          <p className="text-center text-[11px] text-ink-faint">
            Title, department, a valid salary range and at least one approver are required.
          </p>
        )}
      </div>
    </div>
  );
}
