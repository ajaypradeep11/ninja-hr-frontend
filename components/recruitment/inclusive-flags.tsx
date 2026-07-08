"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { CATEGORY_LABELS, type InclusiveFlag } from "@/lib/inclusive-language";

const tone: Record<InclusiveFlag["category"], string> = {
  gendered: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ageist: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ableist: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
  jargon: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "masculine-coded": "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  exclusionary: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

/** Advisory inclusive-language findings for a job description. */
export function InclusiveFlags({ flags }: { flags: InclusiveFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> Inclusive-language check passed.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
        <Sparkles className="h-3 w-3 text-brand-500 dark:text-brand-400" /> Inclusive-language suggestions ({flags.length})
      </p>
      {flags.map((f, i) => (
        <div key={i} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs ${tone[f.category]}`}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">“{f.term}”</span> ({CATEGORY_LABELS[f.category]}) — {f.suggestion}
          </span>
        </div>
      ))}
    </div>
  );
}
