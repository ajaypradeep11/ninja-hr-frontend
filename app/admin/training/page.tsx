export const dynamic = "force-dynamic";
import { getTrainingCourses, getEmployees } from "@/lib/queries";
import { TrainingView } from "./training-view";

export default async function AdminTrainingPage() {
  const [courses, employees] = await Promise.all([getTrainingCourses(), getEmployees()]);
  return (
    <TrainingView
      initialCourses={courses}
      employees={employees.filter((e) => e.status === "Active" || e.status === "On Statutory Leave")}
    />
  );
}
