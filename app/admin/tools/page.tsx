export const dynamic = "force-dynamic";
import { listTools } from "@/app/actions/tools";
import { ToolsView } from "./tools-view";

export default async function ToolLibraryPage() {
  const library = await listTools();
  return <ToolsView initial={library} />;
}
