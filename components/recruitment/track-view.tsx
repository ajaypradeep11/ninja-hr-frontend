"use client";

import * as React from "react";
import { CheckCircle2, Circle, Mail, XCircle } from "lucide-react";
import { withdrawApplication } from "@/app/actions/portal";
import { PORTAL_TIMELINE, type PortalView } from "@/lib/recruitment";
import { cn, formatDate } from "@/lib/utils";

export function TrackView({ initial, token }: { initial: PortalView; token: string }) {
  const [view, setView] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const timelineIdx = PORTAL_TIMELINE.indexOf(view.status as (typeof PORTAL_TIMELINE)[number]);
  const closed = view.withdrawn || view.status === "Process complete";

  async function withdraw() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setView(await withdrawApplication(token));
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-card p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Application status
        </p>
        <h1 className="mt-1 text-xl font-bold text-ink">{view.jobTitle}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {view.candidateName} · applied {formatDate(view.appliedDate)}
        </p>

        <div
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
            view.withdrawn
              ? "bg-gray-100 dark:bg-gray-500/20 text-ink-muted"
              : view.status === "Process complete"
                ? "bg-gray-100 dark:bg-gray-500/20 text-ink-muted"
                : "bg-brand-50 text-brand-700 dark:text-brand-400",
          )}
        >
          {view.status}
        </div>

        {!closed && timelineIdx >= 0 && (
          <div className="mt-6 flex items-center">
            {PORTAL_TIMELINE.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  {i <= timelineIdx ? (
                    <CheckCircle2 className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-line" />
                  )}
                  <span
                    className={cn(
                      "mt-1.5 max-w-[80px] text-center text-[10px] font-medium leading-tight",
                      i <= timelineIdx ? "text-ink" : "text-ink-faint",
                    )}
                  >
                    {s}
                  </span>
                </div>
                {i < PORTAL_TIMELINE.length - 1 && (
                  <div className={cn("mx-2 h-0.5 flex-1", i < timelineIdx ? "bg-brand-500" : "bg-line")} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {!view.withdrawn && !closed && (
          <div className="mt-6 border-t border-line pt-4">
            {confirming ? (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Withdraw your application?</p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  This tells the hiring team you&apos;re no longer interested. This cannot be undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={withdraw}
                    disabled={busy}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {busy ? "Withdrawing…" : "Yes, withdraw"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-card"
                  >
                    Keep my application
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-red-600 dark:hover:text-red-300"
              >
                <XCircle className="h-3.5 w-3.5" /> Withdraw my application
              </button>
            )}
            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-7">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Mail className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Messages from the hiring team
        </h2>
        <div className="mt-4 space-y-3">
          {view.communications.length === 0 && (
            <p className="text-sm text-ink-muted">No messages yet.</p>
          )}
          {view.communications.map((c, i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{c.subject}</p>
                <p className="shrink-0 text-[11px] text-ink-faint">{formatDate(c.sentAt.slice(0, 10))}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
