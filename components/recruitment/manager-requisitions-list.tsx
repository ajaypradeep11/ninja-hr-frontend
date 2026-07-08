import Link from "next/link";
import { CalendarClock, ClipboardCheck, Crown, EyeOff, Users2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import type { RequisitionSummary } from "@/lib/recruitment";

const statusTone: Record<string, "gray" | "amber" | "sky" | "green"> = {
  Draft: "gray",
  "Pending Approval": "amber",
  Approved: "sky",
  Published: "green",
};

/**
 * Manager dashboard grid for "My Requisitions".
 *
 * RBAC note: filtering is done SERVER-side — `GET /recruitment/requisitions`
 * scopes to requisitions where the actor is the creator (hiring manager), a
 * named approver, or on the hiring team. This component additionally narrows
 * to the roles the pipeline concerns: hiring manager / hiring team / panel.
 */
export function ManagerRequisitionsList({ requisitions }: { requisitions: RequisitionSummary[] }) {
  // Only roles with pipeline involvement — pure approvers see their queue above.
  const mine = requisitions.filter(
    (r) => !r.archived && (r.viewerIsHiringManager || r.viewerOnHiringTeam),
  );

  if (mine.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-canvas px-4 py-6 text-center text-sm text-ink-muted">
        You&apos;re not currently the hiring manager or an interviewer on any requisition.
      </p>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mine.map((r) => (
        <Card key={r.id} className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/employee/recruitment/${r.id}`}
                className="block truncate text-sm font-bold text-ink hover:text-brand-600 dark:hover:text-brand-300"
              >
                {r.title}
              </Link>
              <p className="text-xs text-ink-muted">{r.department} · Ontario</p>
            </div>
            <Badge tone={statusTone[r.status]}>{r.status}</Badge>
          </div>

          {/* The viewer's relationship to this requisition */}
          <div className="mt-2 flex flex-wrap gap-1">
            {r.viewerIsHiringManager && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-400">
                <Crown className="h-3 w-3" /> Hiring Manager
              </span>
            )}
            {r.viewerIsPanelMember ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <ClipboardCheck className="h-3 w-3" /> Panel Member
              </span>
            ) : (
              r.viewerOnHiringTeam && (
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                  <Users2 className="h-3 w-3" /> Hiring Team
                </span>
              )
            )}
            {r.blindHiring && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <EyeOff className="h-3 w-3" /> Blind
              </span>
            )}
          </div>

          {/* High-level stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <div>
              <p className="text-lg font-bold leading-tight text-ink">{r.applicants}</p>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
                <Users2 className="h-3 w-3" /> Applicants
              </p>
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-ink">{r.interviewsScheduled}</p>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
                <CalendarClock className="h-3 w-3" /> In interview
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Link
              href={`/employee/recruitment/${r.id}/applicants`}
              className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              View applicants
            </Link>
            <Link
              href={`/employee/recruitment/${r.id}`}
              className="flex-1 rounded-xl border border-line bg-card px-3 py-2 text-center text-xs font-semibold text-ink-soft transition hover:bg-canvas"
            >
              Details
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
