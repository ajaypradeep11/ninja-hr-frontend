export const dynamic = "force-dynamic";
import { getVaultDocuments } from "@/lib/queries";
import DocumentsView from "./documents-view";

export default async function EmployeeDocuments() {
  const documents = await getVaultDocuments();
  return <DocumentsView documents={documents} />;
}
