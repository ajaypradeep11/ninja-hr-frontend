export const dynamic = "force-dynamic";
import { getCandidates } from "@/lib/queries";
import { AtsView } from "./ats-view";

export default async function AtsPage() {
  const candidates = await getCandidates();
  return <AtsView initial={candidates} />;
}
