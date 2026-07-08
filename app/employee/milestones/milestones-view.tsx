"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Gauge,
  PartyPopper,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import type { Milestone, MilestoneCategory } from "@/lib/milestones";
import { cn, formatDate } from "@/lib/utils";

const categoryMeta: Record<
  MilestoneCategory,
  { icon: typeof Wallet; dot: string; chip: string }
> = {
  Compliance: { icon: ShieldAlert, dot: "bg-amber-500", chip: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  Tenure: { icon: PartyPopper, dot: "bg-violet-500", chip: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  Performance: { icon: Gauge, dot: "bg-sky-500", chip: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  Pay: { icon: Wallet, dot: "bg-emerald-500", chip: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

const FILTERS: { key: MilestoneCategory | "All"; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Compliance", label: "Compliance / Probation" },
  { key: "Tenure", label: "Tenure / Anniversaries" },
  { key: "Performance", label: "Performance / Reviews" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MilestonesView({ mine, team }: { mine: Milestone[]; team: Milestone[] }) {
  const hasTeam = team.length > 0;
  const [scope, setScope] = React.useState<"mine" | "team">("mine");
  const [filter, setFilter] = React.useState<MilestoneCategory | "All">("All");

  const source = scope === "team" ? team : mine;
  const rows = source.filter((m) => filter === "All" || m.category === filter);

  // Group chronologically by month for the timeline headers.
  const groups: { label: string; items: Milestone[] }[] = [];
  for (const m of rows) {
    const [y, mo] = m.date.split("-").map(Number);
    const label = `${MONTHS[mo - 1]} ${y}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }

  return (
    <div>
      <PageHeader
        title="Milestones"
        subtitle="Every date that matters — probation windows, anniversaries, reviews and paydays — on one timeline."
        action={
          hasTeam ? (
            <div className="flex gap-1 rounded-xl bg-canvas p-1">
              {(
                [
                  { key: "mine", label: "My Milestones" },
                  { key: "team", label: "My Team" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setScope(t.key)}
                  className={
                    scope === t.key
                      ? "inline-flex items-center gap-1.5 rounded-lg bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-sm"
                      : "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:text-ink"
                  }
                >
                  {t.key === "team" && <Users className="h-4 w-4" />}
                  {t.label}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* Quick-filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filter === f.key
                ? "bg-brand-500 text-white"
                : "border border-line bg-card text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="card-pad">
          <div className="flex flex-col items-center py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-ink-faint">
              <CalendarClock className="h-6 w-6" />
            </span>
            <p className="text-sm text-ink-muted">
              No {filter === "All" ? "" : filter.toLowerCase() + " "}milestones in the next 6
              months{scope === "team" ? " for your team" : ""}.
            </p>
          </div>
        </Card>
      ) : (
        <div className="relative pl-6">
          {/* Timeline spine */}
          <div className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />

          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="relative mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  <span className="absolute -left-6 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card bg-ink-faint" />
                  {g.label}
                </p>
                <div className="space-y-3">
                  {g.items.map((m) => {
                    const meta = categoryMeta[m.category];
                    const Icon = meta.icon;
                    const urgent =
                      m.category === "Compliance" && m.daysUntil >= 0 && m.daysUntil <= 14;
                    return (
                      <Card
                        key={m.id}
                        className={cn("card-pad relative", urgent && "border-amber-300")}
                      >
                        <span
                          className={cn(
                            "absolute -left-6 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card",
                            meta.dot,
                          )}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          {scope === "team" ? (
                            <Avatar name={m.employeeName} size={38} />
                          ) : (
                            <span
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                meta.chip,
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink">
                                {scope === "team" ? `${m.employeeName} — ${m.title}` : m.title}
                              </p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  meta.chip,
                                )}
                              >
                                {m.category}
                              </span>
                              {urgent && <Badge tone="amber">Due soon</Badge>}
                            </div>
                            <p className="text-xs text-ink-muted">{m.sub}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {scope === "team" &&
                              m.actions?.map((a) => (
                                <Link
                                  key={a.label}
                                  href={a.href}
                                  className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 dark:hover:text-brand-300"
                                >
                                  {a.label}
                                </Link>
                              ))}
                            <div className="text-right">
                              <p className="text-sm font-bold text-ink">
                                {formatDate(m.date, { year: undefined })}
                              </p>
                              <p className="text-[11px] text-ink-faint">
                                {m.daysUntil === 0
                                  ? "Today"
                                  : m.daysUntil > 0
                                    ? `in ${m.daysUntil} day${m.daysUntil === 1 ? "" : "s"}`
                                    : `${-m.daysUntil} day${m.daysUntil === -1 ? "" : "s"} ago`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
