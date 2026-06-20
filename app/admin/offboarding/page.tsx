export const dynamic = "force-dynamic";
import { getOffboardingTasks } from "@/lib/queries";
import { OffboardingView } from "./offboarding-view";

export default async function OffboardingPage() {
  const tasks = await getOffboardingTasks();
  return <OffboardingView initialTasks={tasks} />;
}
