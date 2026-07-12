"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, X, XCircle } from "lucide-react";
import { Badge, Card, ComplianceBadge } from "@/components/ui";
import type { Requisition } from "@/lib/data";
import { validateJobDescription } from "@/lib/compliance";
import { formatCAD } from "@/lib/utils";

interface PostingAudit {
  req: Requisition;
  checks: { label: string; ok: boolean; detail: string }[];
  compliant: boolean;
}

function auditPosting(req: Requisition): PostingAudit {
  // Reuse the same engine the JD editor runs, so the badge can never disagree
  // with the authoring-time validation. Posting body text isn't stored on the
  // requisition, so body-content rules are checked at publish time instead.
  const issues = validateJobDescription({
    province: req.province,
    salaryMin: req.salaryMin || undefined,
    salaryMax: req.salaryMax || undefined,
    body: "",
  });
  const hasRange = !!(req.salaryMin && req.salaryMax);
  const spreadOk = hasRange && req.salaryMax - req.salaryMin <= 50_000;
  const checks = [
    {
      label: "Salary range disclosed",
      ok: hasRange,
      detail: hasRange
        ? `${formatCAD(req.salaryMin, { maximumFractionDigits: 0 })} – ${formatCAD(req.salaryMax, { maximumFractionDigits: 0 })}`
        : "No salary range on this posting — required by Bill 149.",
    },
    {
      label: "Range spread within $50,000 cap",
      ok: spreadOk,
      detail: hasRange
        ? `Spread: ${formatCAD(req.salaryMax - req.salaryMin, { maximumFractionDigits: 0 })}`
        : "Cannot assess without a salary range.",
    },
  ];
  return { req, checks, compliant: issues.every((i) => i.level !== "error") };
}

/**
 * The dashboard's "Bill 149 Compliant" tag, now clickable: opens a live
 * compliance audit of Ontario job postings computed from requisition data.
 */
export function Bill149Badge({ requisitions }: { requisitions: Requisition[] }) {
  const [open, setOpen] = React.useState(false);

  const ontario = requisitions.filter((r) => r.province === "ON");
  const audits = ontario.map(auditPosting);
  // The badge reflects LIVE postings — a non-compliant draft isn't a violation yet.
  const liveIssues = audits.filter((a) => a.req.status === "Published" && !a.compliant);
  const ok = liveIssues.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Open the Bill 149 compliance audit"
        className="rounded-full transition-shadow hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ComplianceBadge variant={ok ? "ok" : "warn"}>
          {ok ? "Bill 149 Compliant" : `Bill 149 — ${liveIssues.length} issue${liveIssues.length === 1 ? "" : "s"}`}
        </ComplianceBadge>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <Card className="card-pad flex max-h-[85vh] w-full max-w-lg flex-col sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">Bill 149 compliance</h3>
                  <p className="text-xs text-ink-muted">
                    Ontario job postings · salary transparency checklist
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {audits.length === 0 && (
                <p className="rounded-xl bg-canvas px-3 py-6 text-center text-sm text-ink-muted">
                  No Ontario requisitions right now — nothing in scope for Bill 149.
                </p>
              )}
              {audits.map(({ req, checks, compliant }) => (
                <div key={req.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{req.title}</p>
                      <p className="text-xs text-ink-muted">
                        {req.department} · {req.status}
                      </p>
                    </div>
                    <Badge tone={compliant ? "green" : "red"}>
                      {compliant ? "Compliant" : "Non-compliant"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {checks.map((c) => (
                      <div key={c.label} className="flex items-start gap-2 text-sm">
                        {c.ok ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-ink-soft">{c.label}</p>
                          <p className="text-xs text-ink-muted">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                      <p className="text-xs text-ink-muted">
                        AI-disclosure footer (“Artificial Intelligence is utilized in the
                        screening process”) is auto-appended at publish time.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Computed live from requisition data — per-posting audit history isn&apos;t
                recorded yet, so this view shows current state rather than a timeline.
              </span>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
