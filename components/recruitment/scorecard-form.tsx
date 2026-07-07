"use client";

import * as React from "react";
import { ClipboardCheck, NotebookPen, Pencil } from "lucide-react";
import { submitScorecard } from "@/app/actions/recruitment";
import type { Recommendation, ScorecardCriterionEntry, ScorecardEntry } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

const RECOMMENDATIONS: Recommendation[] = ["Strong Yes", "Yes", "No", "Strong No"];

const recStyle: Record<Recommendation, string> = {
  "Strong Yes": "border-emerald-300 bg-emerald-50 text-emerald-700",
  Yes: "border-sky-300 bg-sky-50 text-sky-700",
  No: "border-amber-300 bg-amber-50 text-amber-700",
  "Strong No": "border-red-300 bg-red-50 text-red-700",
};

/**
 * Interview Guide — the interviewer's individual notes + section ratings.
 *
 * Lifecycle:
 *   Edit  → the form is open; type notes and rate each section (1–5).
 *   Save  → keeps a private draft (only you can see it) and closes the editor.
 *   Edit  → reopens a saved draft anytime before submitting.
 *   Submit→ locks the guide read-only and publishes it to the Interview Panel
 *           tab for the rest of the panel.
 */
export function ScorecardForm({
  candidateId,
  criteria,
  existing,
}: {
  candidateId: string;
  criteria: ScorecardCriterionEntry[];
  /** The viewer's saved guide, if any (draft reopens; submitted locks). */
  existing?: ScorecardEntry;
}) {
  const [ratings, setRatings] = React.useState<Record<string, { rating: number; notes: string }>>(
    Object.fromEntries(
      criteria.map((c) => {
        const prev = existing?.ratings.find((r) => r.criterionId === c.id);
        return [c.id, { rating: prev?.rating ?? 0, notes: prev?.notes ?? "" }];
      }),
    ),
  );
  const [recommendation, setRecommendation] = React.useState<Recommendation | null>(
    existing?.recommendation ?? null,
  );
  const [overallNotes, setOverallNotes] = React.useState(existing?.overallNotes ?? "");

  // Lifecycle state — everything renders from local values, so Save → Edit →
  // Submit flows without a page refresh.
  const [submitted, setSubmitted] = React.useState(existing?.status === "Submitted");
  const [hasDraft, setHasDraft] = React.useState(existing?.status === "Draft");
  const [editing, setEditing] = React.useState(!existing);
  const [justSaved, setJustSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const allRated = criteria.every((c) => (ratings[c.id]?.rating ?? 0) >= 1);
  const canSubmit = allRated && recommendation !== null;

  // Derived state: the Overall score is the live average of every section
  // rated so far — it recalculates on each click, no manual entry.
  const rated = criteria.map((c) => ratings[c.id]?.rating ?? 0).filter((r) => r >= 1);
  const overallAvg = rated.length
    ? Math.round((rated.reduce((s, r) => s + r, 0) / rated.length) * 10) / 10
    : null;

  async function save(status: "DRAFT" | "SUBMITTED") {
    if (busy) return;
    if (status === "SUBMITTED" && (!canSubmit || !recommendation)) return;
    setBusy(true);
    setError(null);
    try {
      await submitScorecard(candidateId, {
        // A draft still needs a recommendation value for the column; default to "Yes".
        recommendation: recommendation ?? "Yes",
        overallNotes: overallNotes.trim() || undefined,
        status,
        ratings: criteria.map((c) => ({
          criterionId: c.id,
          rating: ratings[c.id]?.rating ?? 0,
          notes: ratings[c.id]?.notes.trim() || undefined,
        })),
      });
      if (status === "SUBMITTED") {
        setSubmitted(true);
      } else {
        setHasDraft(true);
        setEditing(false);
        setJustSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your interview guide");
    } finally {
      setBusy(false);
    }
  }

  /* -------- Read-only summary of the current local values ---------- */
  const summaryRows = (
    <div className="mt-3 space-y-1.5">
      {criteria.map((c) => {
        const r = ratings[c.id];
        return (
          <div key={c.id} className="flex items-center gap-2 text-xs">
            <span className="w-40 shrink-0 truncate text-ink-soft">{c.name}</span>
            <span className="font-semibold text-ink">{r?.rating ? `${r.rating}/5` : "—"}</span>
            {r?.notes && <span className="truncate text-ink-muted">— {r.notes}</span>}
          </div>
        );
      })}
    </div>
  );

  const avgChip = (tone: "brand" | "emerald") => (
    <div
      className={cn(
        "shrink-0 rounded-xl border bg-white px-3 py-1.5 text-center",
        tone === "emerald" ? "border-emerald-200" : "border-brand-200",
      )}
    >
      <p
        className={cn(
          "text-lg font-bold leading-tight",
          tone === "emerald" ? "text-emerald-600" : "text-brand-600",
        )}
      >
        {overallAvg ?? "—"}
        <span className="text-[10px] font-normal text-ink-faint">/5</span>
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
        Overall · auto ({rated.length}/{criteria.length})
      </p>
    </div>
  );

  /* ----------------------- Submitted: locked ----------------------- */
  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink">
              <ClipboardCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
              Your interview guide — submitted &amp; locked
            </p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              It now appears under the Interview Panel tab for the whole panel. Submitted
              guides are final so the record stays trustworthy.
            </p>
          </div>
          {avgChip("emerald")}
        </div>
        {summaryRows}
        {recommendation && (
          <p className="mt-2.5 text-xs text-ink-soft">
            <span className="font-semibold">Recommendation:</span> {recommendation}
            {overallNotes && <> · “{overallNotes}”</>}
          </p>
        )}
      </div>
    );
  }

  /* ------------------ Draft saved: view + Edit ---------------------- */
  if (!editing) {
    return (
      <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink">
              <NotebookPen className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
              Your interview guide — draft
            </p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Private to you until submitted. Keep editing during the interview, then submit
              to share it with the panel.
            </p>
          </div>
          {avgChip("brand")}
        </div>
        {justSaved && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
            <ClipboardCheck className="mr-1 inline h-3 w-3" /> Draft saved.
          </p>
        )}
        {summaryRows}
        {recommendation && (
          <p className="mt-2.5 text-xs text-ink-soft">
            <span className="font-semibold">Recommendation so far:</span> {recommendation}
          </p>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setEditing(true);
              setJustSaved(false);
            }}
            className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            <Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit
          </button>
          <button
            disabled={!canSubmit || busy}
            onClick={() => save("SUBMITTED")}
            className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit to panel"}
          </button>
        </div>
        {!canSubmit && (
          <p className="mt-2 text-center text-[10px] text-ink-faint">
            Rate every section and pick a recommendation before submitting.
          </p>
        )}
      </div>
    );
  }

  /* --------------------------- Editing ------------------------------ */
  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink">
            <NotebookPen className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
            Your interview guide
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Take notes and rate each section as you interview. Save keeps a private draft —
            Submit locks it and shares it with the panel.
          </p>
        </div>
        {avgChip("brand")}
      </div>
      <div className="mt-3 space-y-3">
        {criteria.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-soft">
                {c.name}
                {c.weight != null && <span className="text-ink-faint"> · weight {c.weight}</span>}
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setRatings((prev) => ({ ...prev, [c.id]: { ...prev[c.id], rating: n } }))
                    }
                    className={cn(
                      "h-7 w-7 rounded-lg border text-xs font-bold transition",
                      (ratings[c.id]?.rating ?? 0) >= n
                        ? "border-brand-400 bg-brand-500 text-white"
                        : "border-line bg-white text-ink-faint hover:border-brand-300",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {/* Guiding questions from the admin's interview guide */}
            {c.guidance?.trim() && (
              <ul className="mt-1.5 space-y-0.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                {c.guidance
                  .split("\n")
                  .filter(Boolean)
                  .map((q, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px] text-ink-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {q}
                    </li>
                  ))}
              </ul>
            )}
            <input
              value={ratings[c.id]?.notes ?? ""}
              onChange={(e) =>
                setRatings((prev) => ({ ...prev, [c.id]: { ...prev[c.id], notes: e.target.value } }))
              }
              placeholder="Interview notes / evidence for this section…"
              className="field-input mt-1.5 text-xs"
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium text-ink-soft">Overall recommendation</label>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {RECOMMENDATIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRecommendation(r)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition",
                  recommendation === r ? recStyle[r] : "border-line bg-white text-ink-muted hover:bg-canvas",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          rows={2}
          placeholder="Overall notes (optional)"
          className="field-input resize-none text-xs"
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          {hasDraft && (
            <button
              disabled={busy}
              onClick={() => setEditing(false)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => save("DRAFT")}
            className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            disabled={!canSubmit || busy}
            onClick={() => save("SUBMITTED")}
            className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit to panel"}
          </button>
        </div>
        {!canSubmit && (
          <p className="text-center text-[10px] text-ink-faint">
            Rate every section and pick a recommendation to submit (or Save a private draft now).
          </p>
        )}
      </div>
    </div>
  );
}
