export const dynamic = "force-dynamic";
import { listTemplates } from "@/app/actions/recruitment";
import { TemplatesView } from "./templates-view";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return <TemplatesView initial={templates} />;
}
