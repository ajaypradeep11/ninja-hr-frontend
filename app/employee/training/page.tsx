export const dynamic = "force-dynamic";
import { getMyTraining, listMyCourses } from "@/app/actions/training";
import { EmployeeTrainingView } from "./training-view";

export default async function EmployeeTrainingPage() {
  const [assignments, myCourses] = await Promise.all([getMyTraining(), listMyCourses()]);
  return <EmployeeTrainingView initial={assignments} initialCourses={myCourses} />;
}
