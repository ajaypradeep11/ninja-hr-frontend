"use client";

// In-module extension surface for the Tool Library: an "AI Tools" button that
// opens a right-hand slide-over listing the tools registered for this module
// (tool.surfaces), so agents feel like workflow enhancements rather than
// extra tabs. Same slide-over pattern as the HR Co-Pilot drawer.

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { listTools, type ToolListItem } from "@/app/actions/tools";

export function ToolLauncher({
  surface,
  basePath = "/admin/tools",
}: {
  /** Module surface key, e.g. "recruitment" | "onboarding" | "offboarding" | "performance". */
  surface: string;
  /** Runner base route ("/employee/tools" in the employee console). */
  basePath?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [tools, setTools] = React.useState<ToolListItem[] | null>(null);

  React.useEffect(() => {
    if (!open || tools !== null) return;
    let alive = true;
    listTools(surface)
      .then((lib) => alive && setTools(lib.tools.filter((t) => t.canRun && t.kind === "PROMPT")))
      .catch(() => alive && setTools([]));
    return () => {
      alive = false;
    };
  }, [open, tools, surface]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas"
      >
        <Sparkles className="h-4 w-4 text-brand-500" /> AI Tools
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="AI Tools">
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside
            className={cn(
              "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-card shadow-pop",
            )}
          >
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-ink">
                  <Sparkles className="h-4 w-4 text-brand-500" /> AI Tools for this module
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  From the premium Tool Library — results open in the tool runner.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-ink-faint hover:bg-canvas">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {tools === null && (
                <div className="flex items-center gap-2 py-8 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading tools…
                </div>
              )}
              {tools?.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-muted">
                  No tools are enabled for this module yet. Enable them in the Tool Library.
                </p>
              )}
              {tools?.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`${basePath}/${tool.slug}`}
                  className="group block rounded-xl border border-line p-3.5 transition-colors hover:border-brand-300 hover:bg-canvas"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">{tool.name}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-brand-500" />
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                    {tool.description}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
