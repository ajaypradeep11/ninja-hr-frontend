"use client";

import * as React from "react";
import { Download, Eye, EyeOff, FileText } from "lucide-react";
import type { ParsedResumeView } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

/**
 * In-app résumé viewer. PDFs render natively in an <iframe> pointed at the
 * BFF proxy with `?inline=true` (Content-Disposition: inline) — nobody has to
 * download the file to read it. Non-PDF uploads (e.g. .docx) fall back to the
 * extracted text below, with download still available.
 */
export function ResumeViewer({
  candidateId,
  resume,
}: {
  candidateId: string;
  resume: ParsedResumeView;
}) {
  const isPdf =
    resume.mimeType === "application/pdf" ||
    (resume.fileName ?? "").toLowerCase().endsWith(".pdf");
  // Open by default: reading the résumé is the primary job of this screen.
  const [open, setOpen] = React.useState(isPdf);

  if (!resume.hasFile) return null;
  const inlineUrl = `/api/candidates/${candidateId}/resume?inline=true`;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        {isPdf && (
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
              open
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100",
            )}
          >
            {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {open ? "Hide viewer" : "View in app"}
          </button>
        )}
        <a
          href={`/api/candidates/${candidateId}/resume`}
          className="inline-flex items-center gap-1 rounded-lg bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-line/60"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>

      {isPdf && open && (
        <iframe
          src={inlineUrl}
          title={resume.fileName ?? "Résumé"}
          className="mt-2.5 h-[560px] w-full rounded-xl border border-line bg-white"
        />
      )}

      {!isPdf && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[11px] text-ink-muted">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          This file type doesn&apos;t preview inline — the extracted text below covers the
          content, or download the original.
        </p>
      )}
    </div>
  );
}
