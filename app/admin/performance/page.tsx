export const dynamic = "force-dynamic";
import { getAllGoals, getPerformanceReviews, getPips, getSettings } from "@/lib/queries";
import { runProbationSweep } from "@/app/actions/modules";
import { getActor } from "@/lib/actor";
import { PerformanceView } from "./performance-view";

export default async function PerformancePage() {
  const actor = await getActor();
  // Tenure-based probation automation runs on dashboard load (no cron infra):
  // Day-60 initializes the 90-day review, Day-80 escalates. Run it BEFORE
  // fetching reviews so a just-initialized review shows up immediately.
  const probation = await runProbationSweep().catch(() => null);
  const [reviews, pips, goals, settings] = await Promise.all([
    getPerformanceReviews(),
    getPips(),
    getAllGoals().catch(() => []),
    getSettings(),
  ]);
  return (
    <PerformanceView
      initialReviews={reviews}
      initialPips={pips}
      goals={goals}
      settings={settings}
      probation={probation}
      actorName={actor.name}
    />
  );
}
