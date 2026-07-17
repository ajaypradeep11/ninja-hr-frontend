export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { listTools } from "@/app/actions/tools";
import { ToolRunner } from "@/components/tools/tool-runner";

export default async function AdminToolRunnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const library = await listTools();
  const tool = library.tools.find((t) => t.slug === slug);
  if (!tool) notFound();
  // Built-in tools open at their own route; deep links land there directly.
  if (tool.kind === "BUILTIN") redirect(tool.href ?? "/admin/tools");
  if (!tool.canRun) redirect("/admin/tools");
  return <ToolRunner tool={tool} backHref="/admin/tools" />;
}
