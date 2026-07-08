"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Sparkles, X } from "lucide-react";
import type { Milestone } from "@/lib/milestones";
import { formatDate } from "@/lib/utils";

/**
 * Automated AI nudge for managers: surfaces direct reports whose 90-day
 * probation ends within the next 14 days. "Draft a review" hands the request
 * to the global HR Co-Pilot; the Slack/email push is simulated in this demo.
 */
export function MilestoneNudge({ nudges }: { nudges: Milestone[] }) {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const visible = nudges.filter((n) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  function draftWithCopilot(m: Milestone) {
    window.dispatchEvent(
      new CustomEvent("ninjahr:ask-copilot", {
        detail: {
          question: `Draft a 90-day probationary review summary for ${m.employeeName}, whose probation ends on ${formatDate(m.date)}. Include sections for strengths, areas to improve, and a pass/extend/fail recommendation.`,
        },
      }),
    );
  }

  return (
    <div className="mb-5 space-y-2">
      {visible.map((m) => (
        <div
          key={m.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/70 dark:bg-violet-500/10 px-4 py-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300">
            <Bell className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Action Required: {m.employeeName}&apos;s 90-day probationary period ends on{" "}
              {formatDate(m.date)}.
            </p>
            <p className="text-xs text-ink-muted">
              Would you like to draft a review? (Slack &amp; email alerts simulated in this demo.)
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => draftWithCopilot(m)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              <Sparkles className="h-3.5 w-3.5" /> Draft with Co-Pilot
            </button>
            <Link
              href="/admin/letter-lab"
              className="rounded-lg border border-violet-200 dark:border-violet-500/30 bg-card px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/20"
            >
              Letter Lab
            </Link>
            <button
              onClick={() => setDismissed((d) => [...d, m.id])}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-ink-faint hover:bg-card hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
