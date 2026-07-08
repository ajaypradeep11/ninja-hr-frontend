import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared task-status visuals so Onboarding and Offboarding read identically:
// solid green = Completed, amber = In-Progress, subdued gray = Pending.
const STATUS_PILL: Record<string, string> = {
  Completed: "bg-emerald-500 text-white",
  "In-Progress": "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Pending: "bg-slate-100 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400",
};

export function TaskStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        STATUS_PILL[status] ?? "bg-slate-100 dark:bg-slate-500/20 text-slate-500 dark:text-slate-400",
      )}
    >
      {status}
    </span>
  );
}

/** High-contrast blocking marker — red background + alert icon, sits by the task name. */
export function BlockingTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3" /> Blocking
    </span>
  );
}
