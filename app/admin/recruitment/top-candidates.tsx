"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Candidate } from "@/lib/data";

const scoreTone = (score: number) =>
  score >= 85 ? ("green" as const) : score >= 70 ? ("amber" as const) : ("gray" as const);

export function TopCandidates({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = React.useState<Candidate | null>(null);

  const top = React.useMemo(
    () => [...candidates].sort((a, b) => b.matchScore - a.matchScore).slice(0, 5),
    [candidates],
  );

  return (
    <Card className="card-pad">
      <CardHeader
        title="Top Candidates"
        action={
          <Link
            href="/admin/recruitment/ats"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Open Assistant
          </Link>
        }
      />

      <div className="mt-3 space-y-3">
        {top.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition hover:bg-canvas"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
              <span className="block truncate text-xs text-ink-muted">{c.role}</span>
            </span>
            <Badge tone={scoreTone(c.matchScore)}>{c.matchScore}%</Badge>
          </button>
        ))}

        {top.length === 0 && (
          <div className="rounded-xl bg-canvas px-4 py-8 text-center">
            <Users className="mx-auto h-5 w-5 text-ink-faint" />
            <p className="mt-2 text-xs font-semibold text-ink-soft">No candidates yet</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              AI-ranked candidates appear here as applications arrive.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink-soft">Anti-Bias Shield:</span> the AI ranks
        and flags candidates but can never auto-reject — a human recruiter must make every
        rejection.
      </p>

      {/* Slide-out drawer: AI-parsed resume highlights + match breakdown */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity",
          selected ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSelected(null)}
      />
      <aside
        aria-hidden={!selected}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-white shadow-pop transition-transform duration-300",
          selected ? "translate-x-0" : "translate-x-full",
        )}
      >
        {selected && (
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size={44} />
                <div>
                  <p className="text-base font-bold text-ink">{selected.name}</p>
                  <p className="text-xs text-ink-muted">{selected.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close candidate drawer"
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-canvas p-4 text-center">
                <p className="text-3xl font-bold text-brand-600">{selected.matchScore}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  AI Match Score
                </p>
              </div>
              <div className="rounded-2xl bg-canvas p-4 text-center">
                <Badge tone={scoreTone(selected.matchScore)}>{selected.stage}</Badge>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Current stage
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <FileSearch className="h-3.5 w-3.5" /> AI-parsed resume — strengths
              </p>
              <ul className="mt-2 space-y-1.5">
                {selected.strengths.length ? (
                  selected.strengths.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-ink-soft">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {s}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-ink-muted">None extracted yet.</li>
                )}
              </ul>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Gaps
              </p>
              <ul className="mt-2 space-y-1.5">
                {selected.gaps.length ? (
                  selected.gaps.map((g) => (
                    <li key={g} className="flex items-center gap-2 text-sm text-ink-soft">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> {g}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-ink-muted">None identified.</li>
                )}
              </ul>
            </div>

            <div className="mt-4 text-xs text-ink-muted">
              Applied {formatDate(selected.appliedDate)}
              {selected.interviewDate && <> · Interviewed {formatDate(selected.interviewDate)}</>}
            </div>

            <Link
              href={`/admin/recruitment/candidates/${selected.id}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <UserRound className="h-4 w-4" /> Open full profile
            </Link>
            <p className="mt-3 text-center text-[11px] text-ink-faint">
              Scores flag fit only — rejections always require a human decision.
            </p>
          </div>
        )}
      </aside>
    </Card>
  );
}
