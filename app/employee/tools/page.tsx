export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { listTools } from "@/app/actions/tools";

/** Tools an HR admin has granted to this user (managers/secondary users). */
export default async function EmployeeToolsPage() {
  const library = await listTools();
  const tools = library.tools.filter((t) => t.canRun && t.kind === "PROMPT");

  return (
    <div>
      <PageHeader
        title="AI Tools"
        subtitle="Premium HR tools your admin has assigned to you."
        action={
          <Badge tone="violet" className="px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> Tool Library
          </Badge>
        }
      />
      {tools.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="No tools assigned yet"
          description="Ask your HR admin to grant you access to tools from the Tool Library."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.slug} className="card-pad flex flex-col gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink">{tool.name}</h3>
                <Badge tone="violet" className="mt-1">
                  <Sparkles className="h-3 w-3" /> {tool.category}
                </Badge>
              </div>
              <p className="flex-1 text-[13px] leading-relaxed text-ink-muted">
                {tool.description}
              </p>
              <Link
                href={`/employee/tools/${tool.slug}`}
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-xl bg-brand-500 px-3 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
              >
                Run tool <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
