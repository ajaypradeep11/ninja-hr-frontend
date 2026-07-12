"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import type { OffboardingTask } from "@/lib/data";
import { setOffboardingTaskStatus } from "@/app/actions/modules";
import { cn, formatDate } from "@/lib/utils";

const NEXT_STATUS: Record<OffboardingTask["status"], OffboardingTask["status"]> = {
  Pending: "In-Progress",
  "In-Progress": "Completed",
  Completed: "Pending",
};

const STATUS_TONE = { Completed: "green", "In-Progress": "amber", Pending: "gray" } as const;

/** Open work first so pending items are visible without opening the module. */
function sortTasks(tasks: OffboardingTask[]) {
  const order = { Pending: 0, "In-Progress": 1, Completed: 2 };
  return [...tasks].sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Dashboard Offboarding widget. Each status chip is a manual override: click
 * to advance Pending → In-Progress → Completed (→ back to Pending), persisted
 * through the offboarding task endpoint the module itself uses.
 */
export function OffboardingCard({
  tasks,
  employee,
}: {
  tasks: OffboardingTask[];
  employee: { name: string; lastDay: string };
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(tasks);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setItems(tasks), [tasks]);

  async function advance(task: OffboardingTask) {
    if (busyId) return;
    setBusyId(task.id);
    setError(null);
    try {
      const updated = await setOffboardingTaskStatus(task.id, NEXT_STATUS[task.status]);
      setItems(updated);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the task");
    } finally {
      setBusyId(null);
    }
  }

  const visible = sortTasks(items).slice(0, 4);

  return (
    <Card className="card-pad lg:col-span-4">
      <CardHeader
        title="Offboarding"
        action={
          <Link
            href="/admin/offboarding"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Manage <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={employee.name} size={36} />
        <div>
          <p className="text-sm font-semibold text-ink">{employee.name}</p>
          <p className="text-xs text-ink-muted">
            Last day {formatDate(employee.lastDay, { year: undefined })}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {visible.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-ink-soft">{t.label}</span>
            <button
              onClick={() => advance(t)}
              disabled={!!busyId}
              title={`Click to mark ${NEXT_STATUS[t.status]}`}
              className={cn(
                "shrink-0 rounded-full transition-shadow hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                busyId && busyId !== t.id && "opacity-60",
              )}
            >
              {busyId === t.id ? (
                <Badge tone="gray">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving
                </Badge>
              ) : (
                <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
              )}
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">
        Click a status to advance it — changes sync with the Offboarding module.
      </p>
    </Card>
  );
}
