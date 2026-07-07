export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActor, getUsers } from "@/lib/actor";
import { getEmployees } from "@/lib/queries";
import { getRequisitionDetail } from "@/app/actions/recruitment";
import { ReqForm, type PersonOption } from "@/components/recruitment/req-form";

export default async function AdminEditRequisitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, users, employees, detail] = await Promise.all([
    getActor(),
    getUsers(),
    getEmployees(),
    getRequisitionDetail(id),
  ]);

  // Editing closes once the first application arrives.
  if (detail.applicants > 0) redirect(`/admin/recruitment/${id}`);

  const approverOptions: PersonOption[] = users
    .filter((u) => u.roleCode === "MANAGER" && u.employeeId !== detail.createdById)
    .map((u) => ({ employeeId: u.employeeId, name: u.name, title: u.title, department: u.department }));
  const teamOptions: PersonOption[] = employees.map((e) => ({
    employeeId: e.id,
    name: e.name,
    title: e.title,
    department: e.department,
  }));

  return (
    <div>
      <Link
        href={`/admin/recruitment/${id}`}
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to requisition
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Edit Requisition</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Update any details before the first application arrives — job description, salary, hiring
        team or interview panel.
      </p>
      <div className="mt-7">
        <ReqForm
          approverOptions={approverOptions}
          teamOptions={teamOptions}
          selfEmployeeId={actor.employeeId}
          showJdBuilder
          basePath="/admin/recruitment"
          edit={detail}
        />
      </div>
    </div>
  );
}
