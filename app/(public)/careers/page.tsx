export const dynamic = "force-dynamic";
import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { listJobs } from "@/app/actions/careers";
import { provinceName } from "@/lib/compliance";
import { formatCAD } from "@/lib/utils";

export default async function CareersPage() {
  const jobs = await listJobs();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-ink">Join our team</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        We&apos;re building agentic HR software for the Canadian market. Every posting shows the
        real salary range — as it should.
      </p>

      <div className="mt-8 space-y-3">
        {jobs.length === 0 && (
          <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-ink-muted">
            No open positions right now — check back soon!
          </p>
        )}
        {jobs.map((j) => (
          <Link
            key={j.slug}
            href={`/careers/${j.slug}`}
            className="block rounded-2xl border border-line bg-card p-5 transition hover:border-brand-300 hover:shadow-card-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{j.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {j.department} · {j.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {provinceName(j.province)}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
                {formatCAD(j.salaryMin, { maximumFractionDigits: 0 })} –{" "}
                {formatCAD(j.salaryMax, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
