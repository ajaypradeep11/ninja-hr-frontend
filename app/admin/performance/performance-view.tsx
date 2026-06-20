"use client";

import * as React from "react";
import {
  FileWarning,
  CheckCircle2,
  Circle,
  CalendarClock,
  ShieldAlert,
  PenLine,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Stat,
  PageHeader,
  Avatar,
} from "@/components/ui";
import { issuePip, advanceReviewState } from "@/app/actions/modules";
import type { PerformanceReview, Pip } from "@/lib/data";
import { currentUser } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

const REVIEW_STATES = [
  "Draft",
  "Self-Evaluation",
  "Manager-Evaluation",
  "Calibrated",
  "Completed",
] as const;

const stateTone: Record<string, "gray" | "sky" | "amber" | "brand" | "green"> = {
  Draft: "gray",
  "Self-Evaluation": "sky",
  "Manager-Evaluation": "amber",
  Calibrated: "brand",
  Completed: "green",
};

export function PerformanceView({
  initialReviews,
  initialPips,
}: {
  initialReviews: PerformanceReview[];
  initialPips: Pip[];
}) {
  const [pips, setPips] = React.useState(initialPips);
  const [reviews, setReviews] = React.useState(initialReviews);

  const completed = reviews.filter((r) => r.state === "Completed").length;
  const completionPct = Math.round((completed / reviews.length) * 100);
  const activePips = pips.filter((p) => p.state === "Active").length;

  return (
    <div>
      <PageHeader
        title="Performance Management"
        subtitle="Compliance-aware reviews, goal setting and watertight PIPs that protect against wrongful-dismissal claims."
      />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Review completion" value={`${completionPct}%`} hint={`${completed}/${reviews.length} cycles closed`} tone="green" />
        <Stat label="Active goals" value={18} hint="Across 7 departments" tone="brand" />
        <Stat label="Active PIPs" value={activePips} hint="Dual sign-off tracked" tone="amber" />
        <Stat label="Avg. rating" value="4.0" hint="Calibrated 2026 cycle" tone="sky" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Review pipeline */}
        <Card className="card-pad lg:col-span-2">
          <CardHeader
            title="Review Cycles"
            action={<Button size="sm" variant="outline">New Review Cycle</Button>}
          />
          <div className="mt-4 space-y-4">
            {reviews.map((r) => {
              const idx = REVIEW_STATES.indexOf(r.state as (typeof REVIEW_STATES)[number]);
              return (
                <div key={r.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.employee} size={32} />
                      <div>
                        <p className="text-sm font-semibold text-ink">{r.employee}</p>
                        <p className="text-xs text-ink-muted">{r.cycle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.score && <Badge tone="green">{r.score.toFixed(1)} / 5</Badge>}
                      <Badge tone={stateTone[r.state]}>{r.state}</Badge>
                      {r.state !== "Completed" && (
                        <button
                          onClick={async () => setReviews(await advanceReviewState(r.id))}
                          className="rounded-lg border border-brand-300 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-100"
                        >
                          Advance
                        </button>
                      )}
                    </div>
                  </div>
                  {/* State machine */}
                  <div className="mt-3 flex items-center">
                    {REVIEW_STATES.map((s, i) => (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                          {i <= idx ? (
                            <CheckCircle2 className="h-4 w-4 text-brand-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-line" />
                          )}
                        </div>
                        {i < REVIEW_STATES.length - 1 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1",
                              i < idx ? "bg-brand-500" : "bg-line",
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-faint">
                    <span>Draft</span>
                    <span>Completed</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                    <CalendarClock className="h-3.5 w-3.5" /> Due {formatDate(r.due)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          {/* Probation trigger */}
          <Card className="card-pad">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock className="h-4 w-4 text-brand-500" /> 90-Day probation trigger
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              At day 60 the system auto-initializes a probationary review: <i>&quot;Complete the
              90-day review by Day 80 to determine extension or termination before statutory
              notice applies.&quot;</i>
            </p>
          </Card>

          {/* Constructive dismissal guardrail */}
          <Card className="card-pad border-amber-200 bg-amber-50/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <ShieldAlert className="h-4 w-4" /> Constructive dismissal guardrail
            </div>
            <p className="mt-2 text-xs text-amber-700/90">
              Changing a signed goal&apos;s weight or core responsibility by more than{" "}
              <b>15%</b> is blocked and routed to a mandatory approval workflow with mutual
              signed consent.
            </p>
          </Card>
        </div>
      </div>

      {/* PIP portal */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="card-pad lg:col-span-2">
          <CardHeader title="Structured PIP Portal" />
          <p className="mt-1 text-xs text-ink-muted">
            Confidential — accessible only to HR and the direct manager.
          </p>
          <div className="mt-4 space-y-3">
            {pips.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.employee} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-ink">{p.employee}</p>
                      <p className="text-xs text-ink-muted">
                        Manager: {p.manager} · {p.durationDays} days · starts{" "}
                        {formatDate(p.startDate, { year: undefined })}
                      </p>
                    </div>
                  </div>
                  <Badge tone={p.state === "Active" ? "amber" : p.state === "Completed" ? "green" : "gray"}>
                    {p.state}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <SignOff label="Manager signed" ok={p.signedByManager} />
                  <SignOff label="Employee signed" ok={p.signedByEmployee} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <CreatePipForm onIssued={setPips} />
      </div>
    </div>
  );
}

function SignOff({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", ok ? "text-emerald-600" : "text-ink-faint")}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function CreatePipForm({ onIssued }: { onIssued: (pips: Pip[]) => void }) {
  const [duration, setDuration] = React.useState(60);
  const [outcome, setOutcome] = React.useState("");
  const [support, setSupport] = React.useState("");
  const [refusedBypass, setRefusedBypass] = React.useState(false);
  const [issued, setIssued] = React.useState(false);

  const durationError =
    duration < 30
      ? "A reasonable opportunity to improve typically requires a minimum of 30–90 days to hold up in Canadian courts."
      : null;

  const canIssue =
    !durationError && outcome.trim().length > 0 && support.trim().length > 0;

  async function handleIssuePip() {
    const updatedPips = await issuePip({
      employee: "",
      manager: currentUser.name,
      durationDays: duration,
    });
    onIssued(updatedPips);
    setIssued(true);
  }

  return (
    <Card className="card-pad">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FileWarning className="h-4 w-4 text-brand-500" /> Create PIP
      </div>

      {issued ? (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="mt-2 font-semibold">PIP issued</p>
          <p className="mt-1 text-xs">
            Routed for dual cryptographic sign-off. State stays <b>Draft</b> until both
            manager and employee sign{refusedBypass ? " (or witness bypass is logged)" : ""}.
          </p>
          <button
            onClick={() => setIssued(false)}
            className="mt-3 text-xs font-semibold underline"
          >
            Create another
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="field-label">Duration (days)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="field-input"
            />
            {durationError && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-red-600">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                {durationError}
              </p>
            )}
          </div>
          <div>
            <label className="field-label">Measurable outcome</label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              placeholder="e.g. Close 8 qualified deals per quarter"
              className="field-input resize-none"
            />
          </div>
          <div>
            <label className="field-label">Company support provided</label>
            <textarea
              value={support}
              onChange={(e) => setSupport(e.target.value)}
              rows={2}
              placeholder="e.g. Weekly coaching + enablement budget"
              className="field-input resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={refusedBypass}
              onChange={(e) => setRefusedBypass(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-500"
            />
            <PenLine className="h-3.5 w-3.5 text-ink-faint" />
            Refused to sign — verified by witness HR Admin
          </label>
          <Button
            className="w-full"
            disabled={!canIssue}
            onClick={handleIssuePip}
          >
            Issue PIP
          </Button>
          {!canIssue && !durationError && (
            <p className="text-center text-[11px] text-ink-faint">
              Both measurable outcome and support fields are required.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
