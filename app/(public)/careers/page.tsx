import Link from "next/link";
import { Building2 } from "lucide-react";

// Careers are per-company now (/careers/<company-slug>). There is no global,
// cross-company job board, so the bare /careers root is just a friendly signpost
// rather than a listing of every tenant's openings.
export default function CareersIndexPage() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <Building2 className="mx-auto h-10 w-10 text-brand-500 dark:text-brand-400" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Company careers</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Each company on NinjaHR has its own careers page at{" "}
        <span className="font-mono text-ink-soft">/careers/&lt;company&gt;</span>. Open the link
        your recruiter shared to see their open roles.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        Hiring? Create your workspace
      </Link>
    </div>
  );
}
