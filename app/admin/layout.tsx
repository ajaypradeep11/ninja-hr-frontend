import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
