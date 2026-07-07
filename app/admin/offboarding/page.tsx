export const dynamic = "force-dynamic";
import { getOffboardingTasks } from "@/lib/queries";
import { OffboardingView } from "./offboarding-view";

export default async function OffboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const [tasks, params] = await Promise.all([getOffboardingTasks(), searchParams]);
  return <OffboardingView initialTasks={tasks} subjectName={params.employee} />;
}
