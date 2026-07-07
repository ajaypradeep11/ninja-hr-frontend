export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getCandidateDetail } from "@/app/actions/recruitment";
import { CandidateDetailView } from "@/components/recruitment/candidate-detail";
import { ScorecardForm } from "@/components/recruitment/scorecard-form";

// Reachable by any hiring-team member (managers via Recruitment, panelist
// employees via My Interviews). Backend RBAC (assertCandidateAccess) is the
// gate — a non-team actor gets a 403 from getCandidateDetail.
export default async function TeamCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, candidate] = await Promise.all([getActor(), getCandidateDetail(id)]);
  const myScorecard = candidate.scorecards.find((s) => s.panelistId === actor.employeeId);

  const backHref = actor.roleCode === "MANAGER" ? "/employee/recruitment" : "/employee/interviews";

  return (
    <div>
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <CandidateDetailView
        initial={candidate}
        templates={[]}
        isHr={actor.roleCode === "HR_ADMIN"}
        scorecardSlot={
          candidate.viewerIsPanelMember && candidate.scorecardCriteria.length > 0 && !candidate.anonymized ? (
            <ScorecardForm
              candidateId={candidate.id}
              criteria={candidate.scorecardCriteria}
              existing={myScorecard}
            />
          ) : undefined
        }
      />
    </div>
  );
}
