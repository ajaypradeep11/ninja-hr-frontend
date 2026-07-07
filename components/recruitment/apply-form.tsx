"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Send, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { applyToJob } from "@/app/actions/careers";
import type { JobPostingDetail } from "@/lib/recruitment";

const MAX_RESUME_BYTES = 4 * 1024 * 1024; // 4MB
const ACCEPTED = ["application/pdf", "text/plain"];

export function ApplyForm({ job }: { job: JobPostingDetail }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [resume, setResume] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; mime: string; base64: string } | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [portalToken, setPortalToken] = React.useState<string | null>(null);

  const requiredAnswered = job.preScreenQuestions
    .filter((q) => q.required)
    .every((q) => (answers[q.id] ?? "").trim().length > 0);
  const valid = name.trim() && /.+@.+\..+/.test(email) && consent && requiredAnswered;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileError(null);
    if (!ACCEPTED.includes(f.type)) {
      setFileError("Please upload a PDF or plain-text résumé.");
      return;
    }
    if (f.size > MAX_RESUME_BYTES) {
      setFileError("Résumé must be under 4MB.");
      return;
    }
    const buf = await f.arrayBuffer();
    // Base64-encode client-side so the file rides in the JSON apply body.
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    setFile({ name: f.name, mime: f.type, base64: btoa(binary) });
    // For text résumés, also fill the paste field so parsing has content even with no AI key.
    if (f.type === "text/plain") setResume(new TextDecoder().decode(buf));
  }

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await applyToJob(job.slug, {
        name: name.trim(),
        email: email.trim(),
        resumeText: resume.trim() || undefined,
        resumeFileBase64: file?.base64,
        resumeFileName: file?.name,
        resumeMimeType: file?.mime,
        consent,
        source: "Careers Site",
        answers: Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([questionId, answer]) => ({ questionId, answer: answer.trim() })),
      });
      setPortalToken(res.portalToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (portalToken) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h3 className="mt-3 text-lg font-bold text-ink">Application received!</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
          Thanks {name.split(" ")[0]} — we&apos;ve emailed you a confirmation. Track your
          application status (or withdraw) any time with your personal link:
        </p>
        <Link
          href={`/track/${portalToken}`}
          className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Track my application
        </Link>
        <p className="mt-3 break-all font-mono text-[11px] text-ink-faint">/track/{portalToken}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h3 className="text-base font-bold text-ink">Apply for this role</h3>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="jane@example.com" type="email" />
          </div>
        </div>
        <div>
          <label className="field-label">Résumé</label>
          {file ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/40 px-3.5 py-3">
              <FileText className="h-5 w-5 text-brand-500" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{file.name}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-brand-600">
                <Sparkles className="h-3 w-3" /> Will be auto-parsed
              </span>
              <button onClick={() => setFile(null)} className="text-ink-faint hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-4 py-4 text-sm text-ink-muted transition hover:border-brand-300 hover:bg-canvas">
              <Upload className="h-5 w-5 text-ink-faint" />
              <span>Upload a PDF or text résumé — we&apos;ll extract your details automatically.</span>
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={onFile} className="hidden" />
            </label>
          )}
          {fileError && <p className="mt-1 text-[11px] text-red-500">{fileError}</p>}
        </div>
        <div>
          <label className="field-label">
            {file ? "Anything to add? (optional)" : "…or paste your résumé / experience summary"}
          </label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={file ? 3 : 5}
            className="field-input resize-none"
            placeholder="Paste your resume or a summary of your relevant experience…"
          />
        </div>

        {job.preScreenQuestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Pre-screening questions
            </p>
            {job.preScreenQuestions.map((q) => (
              <div key={q.id}>
                <label className="field-label">
                  {q.question}
                  {q.required && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={2}
                  className="field-input resize-none"
                />
              </div>
            ))}
          </div>
        )}

        <label className="flex items-start gap-3 rounded-xl bg-canvas p-3.5 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-brand-500"
          />
          <span>
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
            I consent to the collection and use of my personal information for recruitment
            purposes. Data is retained per Ontario privacy regulations; I can withdraw my
            application at any time via my tracking link, and request deletion of my data.
          </span>
        </label>

        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>}

        <button
          disabled={!valid || submitting}
          onClick={submit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Application"}
        </button>
        {!valid && (
          <p className="text-center text-[11px] text-ink-faint">
            Name, a valid email, required questions and privacy consent are needed to apply.
          </p>
        )}
      </div>
    </div>
  );
}
