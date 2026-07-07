export const dynamic = "force-dynamic";
import { getEmployees } from "@/lib/queries";
import { getAllAssignments } from "@/app/actions/training";
import { upcomingEvents } from "@/lib/data";
import { TrackerView } from "./tracker-view";

export default async function TrackerPage() {
  const [assignments, employees] = await Promise.all([getAllAssignments(), getEmployees()]);
  return (
    <TrackerView assignments={assignments} employees={employees} upcomingEvents={upcomingEvents} />
  );
}
