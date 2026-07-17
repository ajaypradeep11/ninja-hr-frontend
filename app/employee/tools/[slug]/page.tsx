export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { listTools } from "@/app/actions/tools";
import { ToolRunner } from "@/components/tools/tool-runner";

export default async function EmployeeToolRunnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const library = await listTools();
  const tool = library.tools.find((t) => t.slug === slug);
  if (!tool || tool.kind !== "PROMPT") notFound();
  if (!tool.canRun) redirect("/employee/tools");
  return <ToolRunner tool={tool} backHref="/employee/tools" />;
}
