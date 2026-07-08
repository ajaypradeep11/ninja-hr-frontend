"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import type { CandidateDetail } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

/**
 * Transparent breakdown of the AI match score — no black box. The score is a
 * keyword/skills overlap between the parsed résumé and the requisition's
 * requirements; this card shows exactly which signals moved it and turns the
 * gaps into a concrete interview plan. Part of the Anti-Bias Shield: the AI
 * explains, humans decide.
 */
export function AIReviewSummary({ candidate }: { candidate: CandidateDetail }) {
  const score = candidate.matchScore;
  const matched = candidate.strengths;
  const missing = candidate.gaps;
  const parsedSkills = candidate.resume?.skills ?? [];

  const band =
    score >= 85
      ? { label: "Strong match", tone: "text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" }
      : score >= 70
        ? { label: "Possible match", tone: "text-amber-600 dark:text-amber-300", bar: "bg-amber-500" }
        : { label: "Needs human review", tone: "text-ink-soft", bar: "bg-ink-faint" };

  // Turn the score's inputs into a concrete interview plan: probe every gap,
  // verify the top claimed strengths rather than taking the résumé's word.
  const focus: string[] = [
    ...missing.map((g) => `Probe the "${g}" gap — is it missing experience or just missing from the résumé?`),
    ...matched.slice(0, 2).map((s) => `Verify "${s}" with a concrete example from their last role.`),
  ];
  if (focus.length === 0) focus.push("No flagged gaps — use the interview to test depth beyond the keyword match.");

  return (
    <Card className="card-pad">
      <CardHeader
        title="AI application review"
        action={<Sparkles className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
      />

      {/* Score + what it means */}
      <div className="mt-3 flex items-center gap-4">
        <div className="shrink-0 text-center">
          <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{score}%</p>
          <p className={cn("text-[11px] font-semibold", band.tone)}>{band.label}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-2 w-full rounded-full bg-canvas">
            <div
              className={cn("h-2 rounded-full transition-all", band.bar)}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
            How this score works: overlap between the parsed résumé (skills, work history)
            and this requisition&apos;s requirements. It reads nothing else — no name, photo,
            school, or demographic signals.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Matched */}
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Matched keywords / skills
          </p>
          {matched.length || parsedSkills.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {matched.map((s) => (
                <span key={s} className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                  {s}
                </span>
              ))}
              {parsedSkills
                .filter((s) => !matched.some((m) => m.toLowerCase() === s.toLowerCase()))
                .map((s) => (
                  <span key={s} className="rounded-full bg-card px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200">
                    {s}
                  </span>
                ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">Nothing extracted yet.</p>
          )}
        </div>

        {/* Missing */}
        <div className="rounded-xl border border-amber-100 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing requirements
          </p>
          {missing.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {missing.map((g) => (
                <span key={g} className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">No missing requirements flagged.</p>
          )}
        </div>
      </div>

      {/* Suggested interview focus */}
      <div className="mt-3 rounded-xl border border-line p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          <Crosshair className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" /> Suggested focus for interview
        </p>
        <ul className="mt-2 space-y-1.5">
          {focus.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-ink-soft">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-canvas px-3 py-2 text-[11px] text-ink-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
        <span>
          <span className="font-semibold text-ink-soft">Anti-Bias Shield:</span> this review
          informs your interview — it never decides. The AI cannot reject a candidate at any
          score.
        </span>
      </p>
    </Card>
  );
}
