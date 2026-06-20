"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronLeft,
  Wand2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { PROVINCES, validateJobDescription, type ProvinceCode } from "@/lib/compliance";
import { publishRequisition } from "@/app/actions/modules";
import { cn } from "@/lib/utils";

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Finance", "Marketing", "People", "Operations"];
const TYPES = ["Full-time", "Part-time", "Contractor"] as const;

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
  const body = `Company Overview
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
  return body;
}

export default function NewRequisitionPage() {
  const [title, setTitle] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [type, setType] = React.useState<string>("Full-time");
  const [province, setProvince] = React.useState<ProvinceCode>("ON");
  const [salaryMin, setSalaryMin] = React.useState("");
  const [salaryMax, setSalaryMax] = React.useState("");
  const [reqs, setReqs] = React.useState("");
  const [jd, setJd] = React.useState("");
  const [published, setPublished] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const issues = React.useMemo(
    () =>
      validateJobDescription({
        province,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        body: jd,
      }),
    [province, salaryMin, salaryMax, jd],
  );
  const hasError = issues.some((i) => i.level === "error");

  function generate() {
    setJd(buildJD({ title, dept, type, province, reqs, salaryMin, salaryMax }));
  }

  return (
    <div>
      <Link
        href="/admin/recruitment"
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Recruitment
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Create New Requisition</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Draft a role, generate the description with AI, and validate it against Canadian
        provincial law before publishing.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Intake form */}
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
                <select value={dept} onChange={(e) => setDept(e.target.value)} className="field-input">
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Employment type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="field-input">
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Location / Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value as ProvinceCode)}
                className="field-input"
              >
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
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
            <div>
              <label className="field-label">Key requirements</label>
              <textarea
                value={reqs}
                onChange={(e) => setReqs(e.target.value)}
                rows={4}
                className="field-input resize-none"
                placeholder={"5+ years TypeScript\nLed a team\nAWS experience"}
              />
            </div>
            <button
              onClick={generate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
            >
              <Wand2 className="h-4 w-4" /> Generate Job Description with AI
            </button>
          </div>
        </Card>

        {/* JD preview + compliance */}
        <div className="space-y-5">
          <Card className="card-pad sm:p-6">
            <CardHeader
              title="Generated Job Description"
              action={<Sparkles className="h-4 w-4 text-brand-500" />}
            />
            {jd ? (
              <>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={16}
                  className="mt-4 w-full rounded-xl border border-line bg-canvas/40 p-4 font-mono text-[12.5px] leading-relaxed text-ink-soft outline-none focus:border-brand-300 focus:bg-white"
                />
                {province === "ON" && (
                  <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-[11px] italic text-ink-muted">
                    Auto-appended footer: “Please note: Artificial Intelligence is utilized in
                    the screening process for this role.”
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-line text-center">
                <Wand2 className="h-6 w-6 text-ink-faint" />
                <p className="mt-2 text-sm font-medium text-ink-soft">No description yet</p>
                <p className="text-xs text-ink-muted">
                  Fill in the details and generate with AI.
                </p>
              </div>
            )}
          </Card>

          <Card className="card-pad sm:p-6">
            <CardHeader title="Compliance check" />
            <div className="mt-3 space-y-2">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> No compliance issues for {province}.
                </div>
              ) : (
                issues.map((iss, i) => {
                  const styles =
                    iss.level === "error"
                      ? "bg-red-50 text-red-600"
                      : iss.level === "warning"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-sky-50 text-sky-700";
                  const Icon =
                    iss.level === "error"
                      ? AlertTriangle
                      : iss.level === "warning"
                        ? AlertTriangle
                        : Info;
                  return (
                    <div key={i} className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm", styles)}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{iss.message}</span>
                    </div>
                  );
                })
              )}
            </div>
            {published ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Requisition published successfully!
              </div>
            ) : (
              <button
                disabled={hasError || !jd || publishing}
                onClick={async () => {
                  setPublishing(true);
                  try {
                    await publishRequisition({
                      title,
                      department: dept,
                      province,
                      salaryMin: Number(salaryMin),
                      salaryMax: Number(salaryMax),
                    });
                    setPublished(true);
                  } finally {
                    setPublishing(false);
                  }
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish Requisition"}
              </button>
            )}
            {hasError && !published && (
              <p className="mt-2 text-center text-[11px] text-red-500">
                Resolve all errors before publishing.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
