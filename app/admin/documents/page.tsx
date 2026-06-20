export const dynamic = "force-dynamic";
import { getVaultDocuments } from "@/lib/queries";
import { docFolders } from "@/lib/data";
import { DocumentsView } from "./documents-view";

export default async function DocumentsPage() {
  const vaultDocuments = await getVaultDocuments();
  return (
    <DocumentsView
      initialDocFolders={docFolders}
      initialVaultDocuments={vaultDocuments}
    />
  );
}
