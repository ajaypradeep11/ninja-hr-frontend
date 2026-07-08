export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, Users2, FileSearch, Gauge } from "lucide-react";
import {
  Card,
  CardHeader,
  ComplianceBadge,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";
import { getRequisitions, getCandidates } from "@/lib/queries";
import { RequisitionsTable } from "./requisitions-table";
import { TopCandidates } from "./top-candidates";

export default async function RecruitmentPage() {
  const [requisitions, candidates] = await Promise.all([
    getRequisitions(true),
    getCandidates(),
  ]);

  const activeReqs = requisitions.filter((r) => !r.archived);
  const open = activeReqs.filter((r) => r.status === "Published").length;
  const applicants = activeReqs.reduce((s, r) => s + r.applicants, 0);
  const awaitingPublish = activeReqs.filter((r) => r.status === "Approved").length;
  const avgMatch = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / candidates.length)
    : null;

  // Bill 149 watchdog: an active (published, non-archived) posting must always
  // carry a salary band. If salary data is ever stripped, the badge flips red.
  const salaryViolations = activeReqs.filter(
    (r) => r.status === "Published" && (!r.salaryMin || !r.salaryMax),
  ).length;

  return (
    <div>
      <PageHeader
        title="Requisitions"
        subtitle="Open Ontario roles, approvals and your Bill 149–compliant hiring pipeline."
        action={
          <div className="flex items-center gap-2">
            {salaryViolations > 0 ? (
              <ComplianceBadge variant="warn">
                Bill 149: {salaryViolations} posting{salaryViolations > 1 ? "s" : ""} missing a
                salary range
              </ComplianceBadge>
            ) : (
              <ComplianceBadge />
            )}
            <LinkButton href="/admin/recruitment/analytics" variant="outline">
              Analytics
            </LinkButton>
            <LinkButton href="/admin/recruitment/interview-guide" variant="outline">
              Interview Guide
            </LinkButton>
            <LinkButton href="/admin/recruitment/templates" variant="outline">
              Templates
            </LinkButton>
            <LinkButton href="/admin/recruitment/new">
              <Plus className="h-4 w-4" /> Create New Requisition
            </LinkButton>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Open Roles"
          value={open}
          hint={open > 0 ? "Currently published" : "Nothing published yet"}
        />
        <Stat
          label="Total Applicants"
          value={applicants}
          hint={applicants > 0 ? "Across all reqs" : "Awaiting first applications"}
        />
        <Stat
          label="Avg Match Score"
          value={avgMatch !== null ? `${avgMatch}%` : "—"}
          tone={avgMatch !== null ? "green" : undefined}
          hint={avgMatch !== null ? "AI-ranked" : "No candidates scored yet"}
        />
        <Stat
          label="Awaiting HR publish"
          value={awaitingPublish}
          tone={awaitingPublish > 0 ? "amber" : undefined}
          hint={awaitingPublish > 0 ? "Fully approved reqs" : "All caught up"}
        />
      </div>

      {awaitingPublish > 0 && (
        <Card className="card-pad mb-5 border-sky-200 dark:border-sky-500/30 bg-sky-50/30 dark:bg-sky-500/10">
          <CardHeader title="Publish queue — approved and waiting on HR" />
          <div className="mt-3 space-y-2">
            {activeReqs
              .filter((r) => r.status === "Approved")
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/recruitment/${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-sky-200 dark:border-sky-500/30 bg-card px-4 py-3 transition hover:border-sky-300"
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink">{r.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {r.department} · Ontario
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-300">
                    Add JD &amp; publish →
                  </span>
                </Link>
              ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Card className="card-pad lg:col-span-2">
          <RequisitionsTable requisitions={requisitions} />
        </Card>

        {/* Sticky below the h-16 topbar so the AI sidebar stays in view while
            the requisitions table scrolls independently. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <TopCandidates candidates={candidates} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Users2, t: "Sourcing", d: "Linked to Indeed & LinkedIn for inbound resumes." },
          { icon: FileSearch, t: "AI Resume Screening", d: "Parses resumes and scores against the requisition." },
          { icon: Gauge, t: "Match Ranking", d: "0–100% fit with strengths and gaps breakdown." },
        ].map((x) => (
          <Card key={x.t} className="card-pad">
            <x.icon className="h-5 w-5 text-brand-500 dark:text-brand-400" />
            <p className="mt-2 text-sm font-semibold text-ink">{x.t}</p>
            <p className="mt-1 text-xs text-ink-muted">{x.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
