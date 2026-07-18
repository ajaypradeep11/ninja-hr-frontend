export const dynamic = "force-dynamic";
import { getActor } from "@/lib/actor";
import { getMyReviews } from "@/app/actions/modules";
import { getGrowth, listColleagues } from "@/app/actions/growth";
import { GrowthView } from "./growth-view";

export default async function EmployeeGrowth() {
  const actor = await getActor();
  // my-reviews is actor-scoped (own + direct reports') — the previous
  // getPerformanceReviews() call hit the HR-only endpoint and 403'd for
  // every employee, so this page never showed reviews at all.
  const [growth, myReviews, colleagues] = await Promise.all([
    getGrowth(),
    getMyReviews(),
    listColleagues(),
  ]);
  return (
    <GrowthView
      viewer={{ name: actor.name, title: actor.title, department: actor.department }}
      growth={growth}
      myReviews={myReviews}
      colleagues={colleagues.filter((c) => c.id !== actor.employeeId)}
    />
  );
}
