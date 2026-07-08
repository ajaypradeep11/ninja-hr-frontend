export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActor, getUsers } from "@/lib/actor";
import { getEmployees } from "@/lib/queries";
import { ReqForm, type PersonOption } from "@/components/recruitment/req-form";

export default async function ManagerNewRequisitionPage() {
  const [actor, users, employees] = await Promise.all([getActor(), getUsers(), getEmployees()]);
  if (actor.roleCode === "EMPLOYEE") redirect("/employee");

  const approverOptions: PersonOption[] = users
    .filter((u) => u.roleCode === "MANAGER" && u.employeeId !== actor.employeeId)
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
        href="/employee/recruitment"
        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Recruitment
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Open a Requisition</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Request a new position for your department. Pick the managers who must approve it — HR
        adds the job description and publishes once everyone signs off.
      </p>

      <div className="mt-7">
        <ReqForm
          approverOptions={approverOptions}
          teamOptions={teamOptions}
          selfEmployeeId={actor.employeeId}
          lockedDepartment={actor.department}
          showJdBuilder={false}
          basePath="/employee/recruitment"
        />
      </div>
    </div>
  );
}
