export const dynamic = "force-dynamic";

import { listPolicyDocuments } from "@/app/actions/policies";
import { PoliciesView } from "./policies-view";

export default async function PoliciesPage() {
  const documents = await listPolicyDocuments();
  return <PoliciesView initial={documents} />;
}
