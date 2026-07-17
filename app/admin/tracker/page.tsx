export const dynamic = "force-dynamic";
import { getEmployees } from "@/lib/queries";
import { getAllAssignments } from "@/app/actions/training";
import { deriveUpcomingEvents } from "@/lib/events";
import { TrackerView } from "./tracker-view";

export default async function TrackerPage() {
  const [assignments, employees] = await Promise.all([getAllAssignments(), getEmployees()]);
  // Derived from the live directory (the tracker only shows anniversaries/birthdays).
  const upcomingEvents = deriveUpcomingEvents(employees, [], 8);
  return (
    <TrackerView assignments={assignments} employees={employees} upcomingEvents={upcomingEvents} />
  );
}
