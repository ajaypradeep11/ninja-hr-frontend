import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BRAND } from "@/lib/brand";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        variant="employee"
        consoleLabel={BRAND.employeeConsoleLabel}
        homeHref="/employee"
        ctaLabel="New Request"
        ctaHref="/employee/assistant"
      />
      <div className="pl-60">
        <Topbar
          searchPlaceholder="Search profiles…"
          switchHref="/admin"
          switchLabel="View as Admin"
        />
        <main className="mx-auto max-w-[1500px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
