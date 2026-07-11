export const dynamic = "force-dynamic";
import Link from "next/link";
import { ExternalLink, Globe, Linkedin } from "lucide-react";
import { listRequisitions } from "@/app/actions/recruitment";
import { getActor } from "@/lib/actor";
import { Badge, Card, CardHeader, LinkButton, PageHeader, Stat } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { provinceName } from "@/lib/compliance";

export default async function CareerPageAdmin() {
  const [reqs, actor] = await Promise.all([listRequisitions(), getActor()]);
  const published = reqs.filter((r) => r.status === "Published");
  // The company's public careers URL is tenant-scoped now (/careers/<slug>).
  const careersPath = actor.companySlug ? `/careers/${actor.companySlug}` : "/careers";

  return (
    <div>
      <PageHeader
        title="Career Page"
        subtitle="What candidates see on your public careers site."
        action={
          <LinkButton href={careersPath} variant="outline">
            <Globe className="h-4 w-4" /> View public site
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Live postings" value={published.length} hint={`Visible on ${careersPath}`} tone="green" />
        <Stat
          label="Total applicants"
          value={published.reduce((s, r) => s + r.applicants, 0)}
          hint="Across live roles"
        />
        <Stat label="Public URL" value={careersPath} hint="Shareable careers site" tone="sky" />
      </div>

      <Card className="card-pad">
        <CardHeader title="Live job postings" />
        {published.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No postings are live yet. Publish an approved requisition to see it on the careers site.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {published.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {r.department} · {provinceName(r.province)} · opened {formatDate(r.openedDate)} ·{" "}
                    {r.applicants} applicant{r.applicants === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.slug && actor.companySlug && (
                    <Link
                      href={`/careers/${actor.companySlug}/${r.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                    >
                      View posting <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <Link
                    href={`/admin/recruitment/${r.id}`}
                    className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-canvas"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="card-pad mt-5">
        <CardHeader title="Distribution channels" />
        <p className="mt-1 text-xs text-ink-muted">
          When a role is published, it appears on your careers site and (when enabled per posting)
          links out from these job boards back to the posting.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-ink-soft">
            <Globe className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Careers site
            <Badge tone="green">Active</Badge>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-ink-soft">
            <ExternalLink className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Indeed
            <span className="text-[11px] text-ink-faint">per posting</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-ink-soft">
            <Linkedin className="h-4 w-4 text-sky-600 dark:text-sky-300" /> LinkedIn
            <span className="text-[11px] text-ink-faint">per posting</span>
          </span>
        </div>
      </Card>
    </div>
  );
}
