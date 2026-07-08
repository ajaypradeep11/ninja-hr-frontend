"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import type { RequisitionCandidate } from "@/lib/recruitment";
import { formatDate } from "@/lib/utils";

const STAGES: (RequisitionCandidate["stage"] | "All")[] = [
  "All",
  "Applied",
  "AI Screened",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const stageTone: Record<string, "gray" | "sky" | "brand" | "violet" | "green" | "red"> = {
  Applied: "gray",
  "AI Screened": "sky",
  Interview: "brand",
  Offer: "violet",
  Hired: "green",
  Rejected: "red",
};

export function CandidatesList({ candidates }: { candidates: RequisitionCandidate[] }) {
  const [query, setQuery] = React.useState("");
  const [stage, setStage] = React.useState<(typeof STAGES)[number]>("All");

  const filtered = candidates.filter((c) => {
    if (stage !== "All" && c.stage !== stage) return false;
    if (query && !`${c.name} ${c.role}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Manage Candidates"
        subtitle="Every applicant across your requisitions — search, filter and open a full evaluation profile."
      />

      <Card className="card-pad mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or role…"
              className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-card"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                  (s === stage
                    ? "bg-brand-500 text-white"
                    : "border border-line text-ink-soft hover:bg-canvas")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="card-pad">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-muted">No candidates match your filters.</p>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/admin/recruitment/candidates/${c.id}`}
                className="flex items-center gap-3 py-3 transition hover:bg-canvas/50"
              >
                <Avatar name={c.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {c.name}
                    {c.withdrawn && <span className="ml-2 text-[11px] font-normal text-red-500 dark:text-red-400">Withdrawn</span>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {c.role} · applied {formatDate(c.appliedDate)} · via {c.source}
                  </p>
                </div>
                {c.matchScore > 0 && (
                  <span className="hidden text-xs font-semibold text-ink-soft sm:block">
                    {c.matchScore}% match
                  </span>
                )}
                <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
