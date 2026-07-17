export const dynamic = "force-dynamic";
import { getEmployees, getOffboardingTasks } from "@/lib/queries";
import { OffboardingView } from "./offboarding-view";

export default async function OffboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const [tasks, employees, params] = await Promise.all([
    getOffboardingTasks(),
    getEmployees(),
    searchParams,
  ]);
  // Subject resolution: the deep-linked employee (from the directory's
  // "Initiate Offboarding"), else whoever is actually in Offboarding status.
  // No demo fallback — with neither, the view shows an empty state.
  const fromDirectory = params.employee?.trim() || undefined;
  const active = fromDirectory
    ? employees.find((e) => e.name === fromDirectory)
    : employees.find((e) => e.status === "Offboarding");
  const subjectName = fromDirectory ?? active?.name;
  return (
    <OffboardingView
      initialTasks={tasks}
      subjectName={subjectName}
      subjectTitle={active?.title}
      initiated={!!fromDirectory}
    />
  );
}
