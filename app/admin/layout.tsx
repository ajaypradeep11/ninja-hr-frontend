import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";
import { getActor, getUsers } from "@/lib/actor";
import { OnboardingProvider } from "@/components/onboarding-store";
import { getAdminNotifications } from "@/lib/notifications";
import { listTools } from "@/app/actions/tools";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actor, users, notifications, toolLibrary] = await Promise.all([
    getActor(),
    getUsers(),
    // What's waiting on HR right now — drives the topbar bell.
    getAdminNotifications(),
    // Tool Library state: built-in Intelligence tools an admin disabled
    // company-wide disappear from the sidebar. Never let it break the shell.
    listTools().catch(() => null),
  ]);
  // The admin console is HR-only; managers and employees use /employee.
  if (actor.roleCode !== "HR_ADMIN") redirect("/employee");
  // Gate the impersonation switcher on the *real* signed-in user, not the
  // (possibly impersonated) actor — only HR admins may switch identities.
  const realIsAdmin = users.find((u) => u.id === actor.realUserId)?.roleCode === "HR_ADMIN";
  const hiddenHrefs = (toolLibrary?.tools ?? [])
    .filter((t) => t.kind === "BUILTIN" && !t.enabled && t.href)
    .map((t) => t.href as string);

  return (
    <OnboardingProvider scope="hr">
    <div className="min-h-screen bg-background">
      <Sidebar
        variant="admin"
        consoleLabel={BRAND.adminConsoleLabel}
        homeHref="/admin"
        ctaLabel="New Workflow"
        ctaHref="/admin/onboarding/preboard"
        hiddenHrefs={hiddenHrefs}
      />
      <div className="pl-60">
        <Topbar
          searchPlaceholder="Search employee or document…"
          switchHref="/employee"
          switchLabel="View as Employee"
          users={users}
          actor={actor}
          realIsAdmin={realIsAdmin}
          notifications={notifications}
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
    </OnboardingProvider>
  );
}
