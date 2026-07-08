export const dynamic = "force-dynamic";
import { getActor } from "@/lib/actor";
import { getEmployees, getPerformanceReviews } from "@/lib/queries";
import {
  directReports,
  employeeMilestones,
  teamMilestones,
} from "@/lib/milestones";
import { MilestonesView } from "./milestones-view";

export default async function MilestonesPage() {
  const [actor, employees, reviews] = await Promise.all([
    getActor(),
    getEmployees(),
    getPerformanceReviews().catch(() => []),
  ]);
  const me = employees.find((e) => e.id === actor.employeeId);
  const mine = me ? employeeMilestones(me, reviews, { includePayday: true }) : [];
  const team = teamMilestones(directReports(employees, actor.name), reviews);

  return <MilestonesView mine={mine} team={team} />;
}
