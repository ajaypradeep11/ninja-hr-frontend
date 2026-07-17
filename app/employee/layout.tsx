import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";
import { getActor, getUsers } from "@/lib/actor";
import { getAssignedCandidates, listRequisitions } from "@/app/actions/recruitment";
import { getMyCase } from "@/app/actions/onboarding";
import { OnboardingProvider } from "@/components/onboarding-store";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actor, users] = await Promise.all([getActor(), getUsers()]);
  const isHr = actor.roleCode === "HR_ADMIN";
  const isManager = actor.roleCode === "MANAGER";
  // Gate the impersonation switcher on the *real* signed-in user, not the
  // (possibly impersonated) actor — only HR admins may switch identities.
  const realIsAdmin = users.find((u) => u.id === actor.realUserId)?.roleCode === "HR_ADMIN";
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
  // Asks for the caller's OWN case: the cases list is HR-only, so reading it
  // here 403'd for the one person the tab exists for — the new hire.
  const myCase = await getMyCase().catch(() => null);
  const showOnboarding = !!myCase && myCase.status !== "Active";

  return (
    <OnboardingProvider scope="employee">
    <div className="min-h-screen bg-background">
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
          realIsAdmin={realIsAdmin}
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
    </OnboardingProvider>
  );
}
