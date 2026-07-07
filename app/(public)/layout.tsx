import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";

/** Minimal branded shell for the public careers site + candidate portal. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/careers" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold text-brand-700">{BRAND.name}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Careers
              </span>
            </span>
          </Link>
          <Link href="/careers" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Open positions
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      <footer className="border-t border-line bg-white">
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
