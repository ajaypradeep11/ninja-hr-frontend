export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getRequisitionCandidates, getRequisitionDetail } from "@/app/actions/recruitment";
import { PageHeader } from "@/components/ui";
import { ManagerPipeline } from "@/components/recruitment/manager-pipeline";

// Scoped applicants view for the hiring manager + hiring team. Backend RBAC is
// the gate: getRequisitionCandidates 403s for anyone outside HR / the creator /
// the team, so this page never renders for an unrelated manager.
export default async function ManagerApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (actor.roleCode === "EMPLOYEE") redirect("/employee");

  const [detail, candidates] = await Promise.all([
    getRequisitionDetail(id),
    getRequisitionCandidates(id),
  ]);

  return (
    <div>
      <Link
        href="/employee/recruitment"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to My Requisitions
      </Link>
      <PageHeader
        title={`${detail.title} — Applicants`}
        subtitle={`${detail.department} · ${detail.applicants} applicant${detail.applicants === 1 ? "" : "s"} · everyone who applied, organized by hiring stage.`}
      />
      <ManagerPipeline candidates={candidates} blind={detail.blindHiring && actor.roleCode !== "HR_ADMIN"} />
    </div>
  );
}
