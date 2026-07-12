import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { ArcGauge, Card, CardHeader } from "@/components/ui";
import type { PerformanceReview } from "@/lib/data";

/**
 * Team Health — derived from live performance reviews instead of a hardcoded
 * 88%/45. The gauge is the average calibrated review score as a percentage;
 * the whole card drills down into the performance module.
 */
export function TeamHealthCard({ reviews }: { reviews: PerformanceReview[] }) {
  const scored = reviews.filter((r) => typeof r.score === "number");
  const avg = scored.length
    ? scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length
    : null;
  const pct = avg === null ? null : Math.round((avg / 5) * 100);
  const active = reviews.filter((r) => r.state !== "Completed").length;

  return (
    <Card className="card-pad lg:col-span-4 transition-shadow hover:shadow-pop">
      <CardHeader
        title="Team Health"
        action={
          <span className="group relative inline-flex">
            <Info className="h-4 w-4 cursor-help text-ink-faint" />
            {/* Hover tooltip — explains where the number comes from. */}
            <span className="pointer-events-none absolute right-0 top-6 z-30 hidden w-64 rounded-xl border border-line bg-card p-3 text-left text-xs font-normal text-ink-soft shadow-pop group-hover:block">
              <b className="text-ink">How this is calculated</b>
              <br />
              {avg === null
                ? "No calibrated review scores yet — the gauge fills in once reviews reach Calibrated or Completed with a score."
                : `Average review score of ${avg.toFixed(1)} / 5 across ${scored.length} scored review${scored.length === 1 ? "" : "s"}, shown as a percentage.`}{" "}
              Click the card to open the active reviews.
            </span>
          </span>
        }
      />
      <Link
        href="/admin/performance"
        className="group flex flex-col items-center justify-center rounded-xl py-3 transition-colors hover:bg-canvas/60"
        title="Open performance reviews"
      >
        <ArcGauge value={pct ?? 0} label={pct === null ? "—" : undefined} sublabel="Performance" />
        <p className="mt-1 text-center text-xs text-ink-muted">
          Overall performance across {active} active review{active === 1 ? "" : "s"}
        </p>
        <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:text-brand-700 dark:group-hover:text-brand-300">
          View reviews <ArrowUpRight className="h-3 w-3" />
        </span>
      </Link>
    </Card>
  );
}
