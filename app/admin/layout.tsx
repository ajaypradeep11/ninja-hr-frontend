import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";
import { getActor, getUsers } from "@/lib/actor";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actor, users] = await Promise.all([getActor(), getUsers()]);
  // The admin console is HR-only; managers and employees use /employee.
  if (actor.roleCode !== "HR_ADMIN") redirect("/employee");

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        variant="admin"
        consoleLabel={BRAND.adminConsoleLabel}
        homeHref="/admin"
        ctaLabel="New Workflow"
        ctaHref="/admin/onboarding/preboard"
      />
      <div className="pl-60">
        <Topbar
          searchPlaceholder="Search employee or document…"
          switchHref="/employee"
          switchLabel="View as Employee"
          users={users}
          actor={actor}
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
