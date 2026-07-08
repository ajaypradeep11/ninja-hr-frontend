import Link from "next/link";
import { AlertTriangle, EyeOff, Lock } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import type { RequisitionCandidate } from "@/lib/recruitment";
import { cn, formatDate } from "@/lib/utils";

const STAGES: RequisitionCandidate["stage"][] = [
  "Applied",
  "AI Screened",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const stageTone: Record<string, string> = {
  Applied: "border-t-ink-faint",
  "AI Screened": "border-t-sky-400",
  Interview: "border-t-brand-400",
  Offer: "border-t-violet-400",
  Hired: "border-t-emerald-400",
  Rejected: "border-t-red-300",
};

/**
 * Applicants board — the scoped, READ-ONLY view of a requisition's applicants
 * for the hiring manager and panel members ("pipeline" in admin-speak; plain
 * "Applicants" for managers). No drag-and-drop, no stage buttons, no
 * requisition editing: moving candidates and rejections are Admin (HR)
 * actions. Cards open the shared CandidateDetailView.
 *
 * Blind Hiring: names arrive pre-scrubbed from the server for non-HR viewers,
 * so this component never sees a real identity to leak.
 */
export function ManagerPipeline({
  candidates,
  blind,
}: {
  candidates: RequisitionCandidate[];
  blind: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          View only — HR moves applicants between stages and makes the decisions. Your input
          happens in each applicant&apos;s Interview Guide.
        </p>
        {blind && (
          <p className="flex items-center gap-1.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-700 dark:text-violet-300">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            Blind Hiring is on — identities are hidden until HR turns it off.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = candidates.filter((c) => c.stage === stage);
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
                {items.map((c) => (
                  <Link key={c.id} href={`/employee/recruitment/candidates/${c.id}`} className="block">
                    <Card
                      className={cn(
                        "border-t-2 p-3 transition hover:shadow-card-lg",
                        stageTone[stage],
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {!blind && <Avatar name={c.name} size={28} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                          <p className="truncate text-[11px] text-ink-muted">
                            Applied {formatDate(c.appliedDate)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge tone={c.matchScore >= 85 ? "green" : c.matchScore >= 70 ? "amber" : "gray"}>
                          {c.matchScore}% match
                        </Badge>
                        {c.withdrawn && (
                          <span title="Candidate withdrew">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
                {items.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11px] text-ink-faint">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
