"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  EyeOff,
  Eye,
  AlertTriangle,
  CheckCircle2,
  UserRound,
  LayoutGrid,
  GalleryHorizontalEnd,
  GripVertical,
} from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import type { RequisitionCandidate as Candidate } from "@/lib/recruitment";
import { setCandidateStageScoped } from "@/app/actions/recruitment";
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

export interface AtsRequisitionOption {
  id: string;
  title: string;
  province: string;
  applicants: number;
}

export function AtsView({
  requisitions,
  selectedId,
  initial,
}: {
  requisitions: AtsRequisitionOption[];
  selectedId?: string;
  initial: Candidate[];
}) {
  const router = useRouter();
  const [list, setList] = React.useState<Candidate[]>(initial);
  const [blind, setBlind] = React.useState(false);
  const [selected, setSelected] = React.useState<Candidate | null>(null);
  const [moveError, setMoveError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"board" | "browse">("board");
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<Candidate["stage"] | null>(null);

  // Server refetches candidates when the requisition changes.
  React.useEffect(() => setList(initial), [initial]);

  const currentReq = requisitions.find((r) => r.id === selectedId);

  async function moveTo(id: string, newStage: Candidate["stage"]) {
    const candidate = list.find((c) => c.id === id);
    if (!candidate || candidate.stage === newStage) return;
    try {
      setMoveError(null);
      setList(await setCandidateStageScoped(id, newStage));
    } catch (err) {
      // Keep the current board — a failed PATCH must not wipe it.
      setMoveError(err instanceof Error ? err.message : "Failed to move candidate");
    }
  }

  function move(id: string, dir: 1 | -1) {
    const candidate = list.find((c) => c.id === id);
    if (!candidate) return;
    const idx = STAGES.indexOf(candidate.stage);
    const next = Math.min(STAGES.length - 1, Math.max(0, idx + dir));
    return moveTo(id, STAGES[next]);
  }

  function handleDrop(stage: Candidate["stage"], e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragOverStage(null);
    setDragId(null);
    if (id) moveTo(id, stage);
  }

  // Mask index comes from the live list (not the initial snapshot) so
  // candidates added after mount don't all collapse to "Candidate #0".
  const maskIndex = (id: string) => {
    const i = list.findIndex((x) => x.id === id);
    return i === -1 ? list.length : i;
  };
  const mask = (name: string, i: number) => (blind ? `Candidate #${i + 1}` : name);

  return (
    <div>
      <Link
        href="/admin/recruitment"
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Requisitions
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            AI Recruitment Assistant
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {currentReq ? `${currentReq.title} · ${currentReq.province}` : "No requisition selected"} ·
            AI-ranked pipeline with bias-safe screening.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedId ?? ""}
            onChange={(e) => router.push(`/admin/recruitment/ats?req=${e.target.value}`)}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink outline-none"
          >
            {requisitions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.applicants})
              </option>
            ))}
          </select>
        <div className="inline-flex rounded-xl border border-line bg-white p-0.5">
          <button
            onClick={() => setView("board")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              view === "board" ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-canvas",
            )}
          >
            <LayoutGrid className="h-4 w-4" /> Board
          </button>
          <button
            onClick={() => setView("browse")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              view === "browse" ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-canvas",
            )}
          >
            <GalleryHorizontalEnd className="h-4 w-4" /> Browse
          </button>
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
      </div>

      {moveError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{moveError}</span>
        </div>
      )}

      <div className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Anti-Bias Shield:</span> the AI ranks candidates but
          cannot auto-reject. Only a human can move someone to "Rejected." Ontario Bill 149
          requires a final decision within 5 days of the 45-day interview window.
        </span>
      </div>

      {view === "board" ? (
      <>
      <p className="mb-2 text-xs text-ink-faint">
        Tip: drag a card into another column to move a candidate, or use the arrows.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = list.filter((c) => c.stage === stage);
          const isDropTarget = dragOverStage === stage && dragId !== null;
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
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragLeave={(e) => {
                  // Only clear when the pointer actually leaves the column, not on
                  // moving between child cards.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage((s) => (s === stage ? null : s));
                  }
                }}
                onDrop={(e) => handleDrop(stage, e)}
                className={cn(
                  "flex-1 space-y-2.5 rounded-2xl p-2.5 transition",
                  isDropTarget
                    ? "bg-brand-50 ring-2 ring-inset ring-brand-300"
                    : "bg-canvas/60",
                )}
              >
                {items.map((c) => {
                  const gd = ghostingDays(c);
                  const idx = maskIndex(c.id);
                  return (
                    <Card
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(c.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", c.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverStage(null);
                      }}
                      className={cn(
                        "cursor-grab border-t-2 p-3 transition hover:shadow-card-lg active:cursor-grabbing",
                        stageTone[stage],
                        dragId === c.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-1">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
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
                      </div>
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
                  <p className="px-2 py-6 text-center text-[11px] text-ink-faint">
                    {isDropTarget ? "Drop here" : "Empty"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      ) : (
        <BrowseView
          list={list}
          blind={blind}
          maskIndex={maskIndex}
          mask={mask}
          onMove={moveTo}
          onOpen={setSelected}
        />
      )}

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
                {/* Blind mode must hold in the drawer too, or one click defeats it. */}
                {!blind && <Avatar name={selected.name} size={44} />}
                <div>
                  <p className="text-base font-bold text-ink">
                    {mask(selected.name, maskIndex(selected.id))}
                  </p>
                  {!blind && <p className="text-xs text-ink-muted">{selected.role}</p>}
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
              {selected.withdrawn && (
                <span className="ml-2 font-semibold text-red-500">Withdrawn</span>
              )}
            </div>

            {/* Full profile navigation is blocked while blind mode is on —
                otherwise one click would defeat the masking. */}
            {!blind ? (
              <Link
                href={`/admin/recruitment/candidates/${selected.id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <UserRound className="h-4 w-4" /> Open full profile
              </Link>
            ) : (
              <p className="mt-5 rounded-xl bg-canvas px-3 py-2.5 text-center text-[11px] text-ink-faint">
                Turn off Blind Hiring to open the identifying profile.
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function BrowseView({
  list,
  blind,
  maskIndex,
  mask,
  onMove,
  onOpen,
}: {
  list: Candidate[];
  blind: boolean;
  maskIndex: (id: string) => number;
  mask: (name: string, i: number) => string;
  onMove: (id: string, stage: Candidate["stage"]) => void;
  onOpen: (c: Candidate) => void;
}) {
  const [stage, setStage] = React.useState<Candidate["stage"]>("Applied");
  const [pos, setPos] = React.useState(0);

  // Sort each category by AI match (best first) so browsing surfaces top fits.
  const items = React.useMemo(
    () => list.filter((c) => c.stage === stage).sort((a, b) => b.matchScore - a.matchScore),
    [list, stage],
  );

  // Clamp the cursor whenever the category or its contents change.
  React.useEffect(() => {
    setPos((p) => (items.length === 0 ? 0 : Math.min(p, items.length - 1)));
  }, [items.length]);

  const current = items[pos];
  const stageIdx = STAGES.indexOf(stage);

  return (
    <div>
      {/* Quick-filter: pick a category to browse */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STAGES.map((s) => {
          const count = list.filter((c) => c.stage === s).length;
          const active = s === stage;
          return (
            <button
              key={s}
              onClick={() => {
                setStage(s);
                setPos(0);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-soft hover:bg-canvas",
              )}
            >
              {s}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px]",
                  active ? "bg-brand-100 text-brand-700" : "bg-canvas text-ink-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card className="card-pad text-center text-sm text-ink-muted">
          No candidates in “{stage}.”
        </Card>
      ) : current ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPos((p) => Math.max(0, p - 1))}
            disabled={pos === 0}
            aria-label="Previous candidate"
            className="hidden shrink-0 rounded-full border border-line bg-white p-2 text-ink-soft transition hover:bg-canvas disabled:opacity-30 sm:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <Card className={cn("flex-1 border-t-2 p-6", stageTone[stage])}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {!blind && <Avatar name={current.name} size={48} />}
                <div>
                  <p className="text-lg font-bold text-ink">
                    {mask(current.name, maskIndex(current.id))}
                  </p>
                  {!blind && <p className="text-sm text-ink-muted">{current.role}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-brand-600">{current.matchScore}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  AI Match
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Strengths
                </p>
                <ul className="mt-2 space-y-1.5">
                  {current.strengths.length ? (
                    current.strengths.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-ink-soft">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {s}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-ink-muted">None listed.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Gaps</p>
                <ul className="mt-2 space-y-1.5">
                  {current.gaps.length ? (
                    current.gaps.map((g) => (
                      <li key={g} className="flex items-center gap-2 text-sm text-ink-soft">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> {g}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-ink-muted">None identified.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Move to
                </span>
                <select
                  value={stage}
                  onChange={(e) => onMove(current.id, e.target.value as Candidate["stage"])}
                  className="h-9 rounded-lg border border-line bg-white px-2 text-sm font-semibold text-ink outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onOpen(current)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <UserRound className="h-4 w-4" /> View details
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
              <span>
                {pos + 1} of {items.length} in {stage}
              </span>
              <span>
                Stage {stageIdx + 1} of {STAGES.length}
              </span>
            </div>
          </Card>

          <button
            onClick={() => setPos((p) => Math.min(items.length - 1, p + 1))}
            disabled={pos === items.length - 1}
            aria-label="Next candidate"
            className="hidden shrink-0 rounded-full border border-line bg-white p-2 text-ink-soft transition hover:bg-canvas disabled:opacity-30 sm:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {/* Mobile prev/next */}
      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-center gap-4 sm:hidden">
          <button
            onClick={() => setPos((p) => Math.max(0, p - 1))}
            disabled={pos === 0}
            className="rounded-full border border-line bg-white p-2 text-ink-soft disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs text-ink-muted">
            {pos + 1} / {items.length}
          </span>
          <button
            onClick={() => setPos((p) => Math.min(items.length - 1, p + 1))}
            disabled={pos === items.length - 1}
            className="rounded-full border border-line bg-white p-2 text-ink-soft disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
