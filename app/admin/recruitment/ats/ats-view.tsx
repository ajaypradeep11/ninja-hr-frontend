"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  EyeOff,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import type { Candidate } from "@/lib/data";
import { setCandidateStage } from "@/app/actions/modules";
import { cn, daysBetween, formatDate } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const STAGES: Candidate["stage"][] = [
  "Applied",
  "AI Screened",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const stageTone: Record<Candidate["stage"], string> = {
  Applied: "border-t-ink-faint",
  "AI Screened": "border-t-sky-400",
  Interview: "border-t-brand-400",
  Offer: "border-t-violet-400",
  Hired: "border-t-emerald-400",
  Rejected: "border-t-red-300",
};

// Candidates in Ontario reqs whose interview is aging toward the Bill 149 45-day limit.
function ghostingDays(c: Candidate) {
  if (!c.interviewDate) return null;
  if (!["Interview", "Offer"].includes(c.stage)) return null;
  return daysBetween(c.interviewDate, BRAND.today);
}

export function AtsView({ initial }: { initial: Candidate[] }) {
  const [list, setList] = React.useState<Candidate[]>(initial);
  const [blind, setBlind] = React.useState(false);
  const [selected, setSelected] = React.useState<Candidate | null>(null);

  async function move(id: string, dir: 1 | -1) {
    const candidate = list.find((c) => c.id === id);
    if (!candidate) return;
    const idx = STAGES.indexOf(candidate.stage);
    const next = Math.min(STAGES.length - 1, Math.max(0, idx + dir));
    const newStage = STAGES[next];
    const updated = await setCandidateStage(id, newStage);
    setList(updated);
  }

  const mask = (name: string, i: number) => (blind ? `Candidate #${i + 1}` : name);

  return (
    <div>
      <Link
        href="/admin/recruitment"
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Recruitment
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Applicant Tracking System
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Senior Software Engineer · Ontario · drag candidates through your pipeline.
          </p>
        </div>
        <button
          onClick={() => setBlind((b) => !b)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
            blind
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-line bg-white text-ink-soft hover:bg-canvas",
          )}
        >
          {blind ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Blind Hiring {blind ? "On" : "Off"}
        </button>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Anti-Bias Shield:</span> the AI ranks candidates but
          cannot auto-reject. Only a human can move someone to "Rejected." Ontario Bill 149
          requires a final decision within 5 days of the 45-day interview window.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = list.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {stage}
                </span>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2.5 rounded-2xl bg-canvas/60 p-2.5">
                {items.map((c) => {
                  const gd = ghostingDays(c);
                  const idx = initial.findIndex((x) => x.id === c.id);
                  return (
                    <Card
                      key={c.id}
                      className={cn("border-t-2 p-3 transition hover:shadow-card-lg", stageTone[stage])}
                    >
                      <button onClick={() => setSelected(c)} className="block w-full text-left">
                        <div className="flex items-center gap-2">
                          {!blind && <Avatar name={c.name} size={28} />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {mask(c.name, idx)}
                            </p>
                            {!blind && <p className="truncate text-[11px] text-ink-muted">{c.role}</p>}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge tone={c.matchScore >= 85 ? "green" : c.matchScore >= 70 ? "amber" : "gray"}>
                            {c.matchScore}% match
                          </Badge>
                          {gd !== null && gd >= 40 && (
                            <span title={`Interviewed ${gd} days ago`}>
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                        <button
                          onClick={() => move(c.id, -1)}
                          disabled={STAGES.indexOf(stage) === 0}
                          className="rounded-md p-1 text-ink-faint hover:bg-canvas hover:text-ink disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => move(c.id, 1)}
                          disabled={STAGES.indexOf(stage) === STAGES.length - 1}
                          className="rounded-md p-1 text-ink-faint hover:bg-canvas hover:text-ink disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11px] text-ink-faint">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity",
          selected ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSelected(null)}
      />
      <aside
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
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-canvas p-4 text-center">
              <p className="text-3xl font-bold text-brand-600">{selected.matchScore}%</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                AI Match Score
              </p>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Strengths</p>
              <ul className="mt-2 space-y-1.5">
                {selected.strengths.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-ink-soft">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Gaps</p>
              <ul className="mt-2 space-y-1.5">
                {selected.gaps.length ? (
                  selected.gaps.map((g) => (
                    <li key={g} className="flex items-center gap-2 text-sm text-ink-soft">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> {g}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-ink-muted">None identified.</li>
                )}
              </ul>
            </div>

            <div className="mt-5 rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
              <span className="font-semibold text-brand-700">Recommendation: </span>
              <span className="text-brand-700">
                {selected.matchScore >= 85 ? "Shortlist" : selected.matchScore >= 70 ? "Consider" : "Review"}
              </span>
            </div>

            <div className="mt-4 text-xs text-ink-muted">
              Applied {formatDate(selected.appliedDate)}
              {selected.interviewDate && <> · Interviewed {formatDate(selected.interviewDate)}</>}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
