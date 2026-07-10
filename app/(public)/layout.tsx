import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme";
import { BrandMark } from "@/components/brand-mark";

/** Minimal branded shell for the public careers site + candidate portal. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/careers" className="flex items-center gap-2.5">
            <BrandMark consoleLabel="Careers" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/careers"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Open positions
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      <footer className="border-t border-line bg-card">
        <div className="mx-auto max-w-4xl px-6 py-6 text-xs text-ink-muted">
          <p>
            © {BRAND.name}. Applicant data is collected with consent, used only for recruitment,
            and retained in accordance with Ontario privacy regulations. You may withdraw your
            application at any time via your tracking link.
          </p>
        </div>
      </footer>
    </div>
  );
}
