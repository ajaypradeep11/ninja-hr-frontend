"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Avatar, Card, CardHeader } from "@/components/ui";
import type { LeaveRequest } from "@/lib/data";
import { setLeaveStatus } from "@/app/actions/modules";
import { formatDate } from "@/lib/utils";

/**
 * Dashboard Leave Requests widget. "Review" opens an in-place decision modal
 * (approve/deny + an optional reviewer note) instead of bouncing to the Leave
 * page; the full queue link stays in the header.
 */
export function LeaveRequestsCard({ pending }: { pending: LeaveRequest[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(pending);
  const [reviewing, setReviewing] = React.useState<LeaveRequest | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"Approved" | "Denied" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setItems(pending), [pending]);

  function openReview(request: LeaveRequest) {
    setReviewing(request);
    setNote("");
    setError(null);
  }

  async function decide(status: "Approved" | "Denied") {
    if (!reviewing || busy) return;
    setBusy(status);
    setError(null);
    try {
      await setLeaveStatus(reviewing.id, status, note);
      setItems((list) => list.filter((l) => l.id !== reviewing.id));
      setReviewing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the decision");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="card-pad lg:col-span-5">
      <CardHeader
        title="Leave Requests"
        action={
          <Link
            href="/admin/leave"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Open queue
          </Link>
        }
      />
      <div className="mt-2 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
              <th className="pb-2 font-semibold">Employee</th>
              <th className="pb-2 font-semibold">Type</th>
              <th className="pb-2 font-semibold">Dates</th>
              <th className="pb-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={4} className="py-6 text-center text-sm text-ink-muted">
                  No pending requests — the queue is clear.
                </td>
              </tr>
            )}
            {items.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={l.employee} size={28} />
                    <span className="font-medium text-ink">{l.employee}</span>
                  </div>
                </td>
                <td className="py-2.5 text-ink-muted">{l.type}</td>
                <td className="py-2.5 text-ink-muted">
                  {formatDate(l.start, { year: undefined })} –{" "}
                  {formatDate(l.end, { year: undefined })}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => openReview(l)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={(e) => e.target === e.currentTarget && !busy && setReviewing(null)}
        >
          <Card className="card-pad w-full max-w-md sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Review leave request</h3>
              <button
                onClick={() => setReviewing(null)}
                disabled={!!busy}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Avatar name={reviewing.employee} size={36} />
              <div>
                <p className="text-sm font-semibold text-ink">{reviewing.employee}</p>
                <p className="text-xs text-ink-muted">
                  {reviewing.type} · {formatDate(reviewing.start)} – {formatDate(reviewing.end)} ·{" "}
                  {reviewing.hours ? `${reviewing.hours}h` : `${reviewing.days} day${reviewing.days === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add context for this decision — e.g. coverage arranged with the team."
                className="mt-1.5 w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:bg-card"
              />
              <span className="mt-1 block text-[11px] text-ink-faint">
                Sent along with your approval or denial.
              </span>
            </label>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => decide("Denied")}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <X className="h-3.5 w-3.5" /> {busy === "Denied" ? "Denying…" : "Deny"}
              </button>
              <button
                onClick={() => decide("Approved")}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> {busy === "Approved" ? "Approving…" : "Approve"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
