export const dynamic = "force-dynamic";
import { getTrainingCourses, getEmployees } from "@/lib/queries";
import { upcomingEvents } from "@/lib/data";
import { TrackerView } from "./tracker-view";

export default async function TrackerPage() {
  const [trainingCourses, employees] = await Promise.all([
    getTrainingCourses(),
    getEmployees(),
  ]);
  return (
    <TrackerView
      trainingCourses={trainingCourses}
      employees={employees}
      upcomingEvents={upcomingEvents}
    />
  );
}
