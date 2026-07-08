export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getRequisitionDetail } from "@/app/actions/recruitment";
import { ReqDetail } from "@/components/recruitment/req-detail";

export default async function AdminRequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, detail] = await Promise.all([getActor(), getRequisitionDetail(id)]);

  return (
    <div>
      <Link
        href="/admin/recruitment"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Recruitment
      </Link>
      <ReqDetail
        initial={detail}
        actorEmployeeId={actor.employeeId}
        isHr={actor.roleCode === "HR_ADMIN"}
        basePath="/admin/recruitment"
      />
    </div>
  );
}
