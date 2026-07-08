export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getCandidateDetail, listTemplates } from "@/app/actions/recruitment";
import { CandidateDetailView } from "@/components/recruitment/candidate-detail";
import { ScorecardForm } from "@/components/recruitment/scorecard-form";

export default async function AdminCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, candidate, templates] = await Promise.all([
    getActor(),
    getCandidateDetail(id),
    listTemplates(),
  ]);
  const myScorecard = candidate.scorecards.find((s) => s.panelistId === actor.employeeId);

  return (
    <div>
      <Link
        href="/admin/recruitment/ats"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to ATS
      </Link>
      <CandidateDetailView
        initial={candidate}
        templates={templates}
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
