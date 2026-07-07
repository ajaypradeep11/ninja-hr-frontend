export const dynamic = "force-dynamic";
import { getActor } from "@/lib/actor";
import { getPerformanceReviews } from "@/lib/queries";
import { getGrowth, listColleagues } from "@/app/actions/growth";
import { GrowthView } from "./growth-view";

export default async function EmployeeGrowth() {
  const actor = await getActor();
  const [growth, reviews, colleagues] = await Promise.all([
    getGrowth(),
    getPerformanceReviews(),
    listColleagues(),
  ]);
  const history = reviews
    .filter((r) => r.employee === actor.name)
    .map((r) => ({
      id: r.id,
      cycle: r.cycle,
      date: r.due,
      score: r.score,
      released: r.state === "Completed",
    }));
  return (
    <GrowthView
      viewer={{ name: actor.name, title: actor.title, department: actor.department }}
      growth={growth}
      history={history}
      colleagues={colleagues.filter((c) => c.id !== actor.employeeId)}
    />
  );
}
