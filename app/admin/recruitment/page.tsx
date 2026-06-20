export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, Users2, FileSearch, Gauge, Clock } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  ComplianceBadge,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";
import { getRequisitions, getCandidates } from "@/lib/queries";
import { formatCAD, formatDate } from "@/lib/utils";
import { provinceName } from "@/lib/compliance";

const statusTone = {
  Draft: "gray",
  "Pending Approval": "amber",
  Approved: "sky",
  Published: "green",
} as const;

export default async function RecruitmentPage() {
  const [requisitions, candidates] = await Promise.all([getRequisitions(), getCandidates()]);

  const open = requisitions.filter((r) => r.status === "Published").length;
  const applicants = requisitions.reduce((s, r) => s + r.applicants, 0);
  const avgMatch = Math.round(
    candidates.reduce((s, c) => s + c.matchScore, 0) / candidates.length,
  );

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Requisitions, AI screening and your Bill 149–compliant hiring pipeline."
        action={
          <div className="flex items-center gap-2">
            <ComplianceBadge />
            <LinkButton href="/admin/recruitment/new">
              <Plus className="h-4 w-4" /> Create New Requisition
            </LinkButton>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open Roles" value={open} hint="Currently published" />
        <Stat label="Total Applicants" value={applicants} hint="Across all reqs" />
        <Stat label="Avg Match Score" value={`${avgMatch}%`} tone="green" hint="AI-ranked" />
        <Stat label="Avg Time-to-Hire" value="24d" tone="sky" hint="Requisition → offer" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="card-pad lg:col-span-2">
          <CardHeader title="Active Requisitions" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Role</th>
                  <th className="pb-2 font-semibold">Province</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Salary range</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Applicants</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((r) => (
                  <tr key={r.id} className="border-t border-line align-middle">
                    <td className="py-3">
                      <Link
                        href="/admin/recruitment/ats"
                        className="font-semibold text-ink hover:text-brand-600"
                      >
                        {r.title}
                      </Link>
                      <p className="text-xs text-ink-muted">{r.department}</p>
                    </td>
                    <td className="py-3">
                      <Badge tone="gray">{r.province}</Badge>
                    </td>
                    <td className="py-3 text-ink-muted">{r.type}</td>
                    <td className="py-3 text-ink-muted">
                      {formatCAD(r.salaryMin, { maximumFractionDigits: 0 })} –{" "}
                      {formatCAD(r.salaryMax, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3">
                      <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="py-3 text-right font-semibold text-ink">
                      {r.applicants || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="card-pad">
          <CardHeader
            title="Top Candidates"
            action={
              <Link
                href="/admin/recruitment/ats"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Open ATS
              </Link>
            }
          />
          <div className="mt-3 space-y-3">
            {[...candidates]
              .sort((a, b) => b.matchScore - a.matchScore)
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-ink-muted">{c.role}</p>
                  </div>
                  <Badge tone={c.matchScore >= 85 ? "green" : c.matchScore >= 70 ? "amber" : "gray"}>
                    {c.matchScore}%
                  </Badge>
                </div>
              ))}
          </div>
          <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[11px] text-ink-muted">
            <span className="font-semibold text-ink-soft">Anti-Bias Shield:</span> the AI
            ranks and flags candidates but can never auto-reject — a human recruiter must
            make every rejection.
          </p>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Users2, t: "Sourcing", d: "Linked to Indeed & LinkedIn for inbound resumes." },
          { icon: FileSearch, t: "AI Resume Screening", d: "Parses resumes and scores against the requisition." },
          { icon: Gauge, t: "Match Ranking", d: "0–100% fit with strengths and gaps breakdown." },
        ].map((x) => (
          <Card key={x.t} className="card-pad">
            <x.icon className="h-5 w-5 text-brand-500" />
            <p className="mt-2 text-sm font-semibold text-ink">{x.t}</p>
            <p className="mt-1 text-xs text-ink-muted">{x.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
