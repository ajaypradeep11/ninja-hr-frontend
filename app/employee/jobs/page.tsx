export const dynamic = "force-dynamic";
import Link from "next/link";
import { Briefcase, ExternalLink, MapPin } from "lucide-react";
import { listJobs } from "@/app/actions/careers";
import { Card, PageHeader } from "@/components/ui";
import { provinceName } from "@/lib/compliance";
import { formatCAD } from "@/lib/utils";

export default async function InternalJobBoardPage() {
  const jobs = await listJobs();

  return (
    <div>
      <PageHeader
        title="Internal Job Board"
        subtitle="Published openings across the company — referrals and internal applicants welcome."
      />
      {jobs.length === 0 ? (
        <Card className="card-pad">
          <p className="text-sm text-ink-muted">No open positions right now.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Card key={j.slug} className="card-pad transition hover:shadow-card-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">{j.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> {j.department} · {j.type}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {provinceName(j.province)}
                    </span>
                    <span className="font-semibold text-ink-soft">
                      {formatCAD(j.salaryMin, { maximumFractionDigits: 0 })} –{" "}
                      {formatCAD(j.salaryMax, { maximumFractionDigits: 0 })}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/careers/${j.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  View posting <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
