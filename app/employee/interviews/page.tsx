export const dynamic = "force-dynamic";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getActor } from "@/lib/actor";
import { getAssignedCandidates } from "@/app/actions/recruitment";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const stageTone: Record<string, "gray" | "sky" | "brand" | "violet" | "green" | "red"> = {
  Applied: "gray",
  "AI Screened": "sky",
  Interview: "brand",
  Offer: "violet",
  Hired: "green",
  Rejected: "red",
};

// Any hiring-team member (including non-managers) lands here to evaluate the
// candidates for reqs they're staffed on. HR uses the admin console instead.
export default async function InterviewsPage() {
  const actor = await getActor();
  const candidates = await getAssignedCandidates();

  // Managers reach candidates from their Recruitment section; if a plain
  // employee has no assignments there's nothing to show.
  if (candidates.length === 0 && actor.roleCode === "EMPLOYEE") {
    return (
      <div>
        <PageHeader title="My Interviews" subtitle="Candidates you're assigned to evaluate." />
        <Card className="card-pad">
          <p className="text-sm text-ink-muted">
            You&apos;re not on any hiring teams right now. When you&apos;re added to an interview
            panel, the candidates will appear here.
          </p>
        </Card>
      </div>
    );
  }

  const basePath = actor.roleCode === "HR_ADMIN" ? "/admin/recruitment" : "/employee/recruitment";

  return (
    <div>
      <PageHeader
        title="My Interviews"
        subtitle="Candidates on the requisitions you're staffed on — open one to review and score."
      />
      <Card className="card-pad">
        <div className="space-y-2">
          {candidates.map((c) => (
            <Link
              key={c.id}
              href={`${basePath}/candidates/${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-brand-300"
            >
              <Avatar name={c.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {c.role} · applied {formatDate(c.appliedDate)}
                </p>
              </div>
              <ClipboardList className="h-4 w-4 text-ink-faint" />
              <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
