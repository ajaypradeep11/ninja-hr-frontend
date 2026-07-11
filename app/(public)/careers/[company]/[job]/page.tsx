export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Briefcase } from "lucide-react";
import { getJob } from "@/app/actions/careers";
import { ApplyForm } from "@/components/recruitment/apply-form";
import { provinceName } from "@/lib/compliance";
import { formatCAD } from "@/lib/utils";

export default async function JobPostingPage({
  params,
}: {
  params: Promise<{ company: string; job: string }>;
}) {
  const { company, job: jobSlug } = await params;
  const job = await getJob(jobSlug);
  if (!job) notFound();

  return (
    <div>
      <Link
        href={`/careers/${company}`}
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All open positions
      </Link>

      <div className="rounded-2xl border border-line bg-card p-7">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{job.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" /> {job.department} · {job.type}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {provinceName(job.province)}
          </span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
            {formatCAD(job.salaryMin, { maximumFractionDigits: 0 })} –{" "}
            {formatCAD(job.salaryMax, { maximumFractionDigits: 0 })}
          </span>
        </p>
        <div className="mt-6 whitespace-pre-wrap border-t border-line pt-6 text-sm leading-relaxed text-ink-soft">
          {job.jd}
        </div>
      </div>

      <div className="mt-6">
        <ApplyForm job={job} />
      </div>
    </div>
  );
}
