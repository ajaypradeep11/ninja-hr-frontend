"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Gauge, PartyPopper, ShieldAlert, Wallet } from "lucide-react";
import { Avatar, Card, CardHeader } from "@/components/ui";
import type { Milestone, MilestoneCategory } from "@/lib/milestones";
import { formatDate } from "@/lib/utils";

const categoryIcon: Record<MilestoneCategory, typeof Wallet> = {
  Compliance: ShieldAlert,
  Tenure: PartyPopper,
  Performance: Gauge,
  Pay: Wallet,
};

const categoryIconTone: Record<MilestoneCategory, string> = {
  Compliance: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Tenure: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300",
  Performance: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300",
  Pay: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

/** Tabbed "Upcoming" dashboard widget: My Milestones + (managers) Team Milestones. */
export function UpcomingMilestones({
  mine,
  team,
}: {
  mine: Milestone[];
  team: Milestone[];
}) {
  const hasTeam = team.length > 0;
  const [tab, setTab] = React.useState<"mine" | "team">("mine");
  const rows = (tab === "team" ? team : mine).slice(0, 5);

  return (
    <Card className="card-pad flex flex-col">
      <CardHeader
        title="Upcoming"
        action={
          <Link
            href="/employee/milestones"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            View All
          </Link>
        }
      />

      {hasTeam && (
        <div className="mt-2 flex gap-1 rounded-lg bg-canvas p-1">
          {(
            [
              { key: "mine", label: "My Milestones" },
              { key: "team", label: `Team Milestones (${team.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "flex-1 rounded-md bg-card px-2 py-1.5 text-[11px] font-semibold text-ink shadow-sm"
                  : "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-ink-muted hover:text-ink"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        {rows.length === 0 && (
          <p className="text-sm text-ink-muted">
            {tab === "team" ? "No team milestones on the horizon." : "Nothing coming up. 🎉"}
          </p>
        )}
        {rows.map((m) => {
          const Icon = categoryIcon[m.category] ?? CalendarClock;
          return (
            <div key={m.id} className="flex items-center gap-3">
              {tab === "team" ? (
                <Avatar name={m.employeeName} size={36} />
              ) : (
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryIconTone[m.category]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {tab === "team" ? `${m.employeeName} — ${m.title}` : m.title}
                </p>
                <p className="truncate text-xs text-ink-muted">{m.sub}</p>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-ink-faint">
                {formatDate(m.date, { year: undefined })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
