export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getRequisitionDetail, listRequisitions } from "@/app/actions/recruitment";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ManagerRequisitionsList } from "@/components/recruitment/manager-requisitions-list";

export default async function ManagerRecruitmentPage() {
  const actor = await getActor();
  // Management only — regular employees have no recruitment section.
  if (actor.roleCode === "EMPLOYEE") redirect("/employee");

  const reqs = await listRequisitions();

  // Which pending-approval requisitions are waiting on THIS manager?
  const pending = reqs.filter((r) => r.status === "Pending Approval");
  const details = await Promise.all(pending.map((r) => getRequisitionDetail(r.id).catch(() => null)));
  const awaitingMe = details
    .filter((d): d is NonNullable<typeof d> => !!d)
    .filter((d) =>
      d.approvals.some((a) => a.approverId === actor.employeeId && a.decision === "Pending"),
    );

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Open requisitions for your department and approve requests from other managers."
        action={
          <Link
            href="/employee/recruitment/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Open Requisition
          </Link>
        }
      />

      {awaitingMe.length > 0 && (
        <Card className="card-pad mb-5 border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/10">
          <CardHeader title={`Awaiting your approval (${awaitingMe.length})`} action={<Send className="h-4 w-4 text-amber-500 dark:text-amber-400" />} />
          <div className="mt-3 space-y-2">
            {awaitingMe.map((d) => (
              <Link
                key={d.id}
                href={`/employee/recruitment/${d.id}`}
                className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-500/30 bg-card px-4 py-3 transition hover:border-amber-300"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{d.title}</span>
                  <span className="block text-xs text-ink-muted">
                    {d.department} · {d.province} · ${d.salaryMin.toLocaleString()}–$
                    {d.salaryMax.toLocaleString()}
                    {d.createdByName && <> · requested by {d.createdByName}</>}
                  </span>
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">Review →</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="card-pad">
        <CardHeader title="My requisitions" />
        <p className="mt-1 text-xs text-ink-muted">
          Roles where you&apos;re the hiring manager or on the interview panel — with a scoped,
          read-only view of each pipeline.
        </p>
        <ManagerRequisitionsList requisitions={reqs} />
        {reqs.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing yet — open your first requisition to get a role approved and posted.
          </p>
        )}
      </Card>
    </div>
  );
}
