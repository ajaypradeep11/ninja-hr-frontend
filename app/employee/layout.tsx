import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";
import { getActor, getUsers } from "@/lib/actor";
import { getAssignedCandidates, listRequisitions } from "@/app/actions/recruitment";
import { listCases } from "@/app/actions/onboarding";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actor, users] = await Promise.all([getActor(), getUsers()]);
  const isHr = actor.roleCode === "HR_ADMIN";
  const isManager = actor.roleCode === "MANAGER";
  // Show "My Interviews" to anyone staffed on a hiring team (incl. plain employees).
  const assigned = await getAssignedCandidates().catch(() => []);
  const showInterviews = assigned.length > 0;

  // Recruitment section is involvement-gated, not just role-gated: HR admins
  // always; otherwise only managers with live requisition involvement (hiring
  // manager first and foremost — approver/team membership also counts so
  // approval queues never go dark). Standard employees never see it; the Job
  // Board sits in the base nav for everyone.
  const reqs = isHr || !isManager ? [] : await listRequisitions().catch(() => []);
  const showRecruitment =
    isHr || (isManager && (reqs.some((r) => r.viewerIsHiringManager) || reqs.length > 0));

  // Post-onboarding state: the Onboarding tab only exists while this person has
  // an onboarding case that isn't activated yet. Everyone else (including all
  // long-tenured employees, who never had a case) gets "My Profile" instead.
  const cases = await listCases().catch(() => []);
  const myCase = cases.find((c) => c.name === actor.name);
  const showOnboarding = !!myCase && myCase.status !== "Active";

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        variant="employee"
        consoleLabel={isManager ? "Manager Portal" : BRAND.employeeConsoleLabel}
        homeHref="/employee"
        showRecruitment={showRecruitment}
        showInterviews={showInterviews}
        showOnboarding={showOnboarding}
      />
      <div className="pl-60">
        <Topbar
          searchPlaceholder="Search profiles…"
          switchHref={isHr ? "/admin" : undefined}
          switchLabel={isHr ? "View as Admin" : undefined}
          users={users}
          actor={actor}
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
