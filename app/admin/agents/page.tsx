export const dynamic = "force-dynamic";
import { getAgentRuns } from "@/lib/queries";
import { AgentsView } from "./agents-view";

export default async function AgentsPage() {
  const agentRuns = await getAgentRuns();
  return <AgentsView initial={agentRuns} />;
}
