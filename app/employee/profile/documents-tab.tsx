"use client";

import * as React from "react";
import {
  Download,
  Eye,
  FileText,
  FolderClosed,
  Lock,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, Button, Badge } from "@/components/ui";
import type { VaultDocument } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

// The employee filing cabinet — previously the standalone /employee/documents
// page, now embedded as the Documents tab of My Profile.

interface MyDoc {
  id: string;
  name: string;
  date: string;
  locked?: boolean;
}

interface MyFolder {
  id: string;
  name: string;
  label: string;
  docs: MyDoc[];
}

function folderLabel(folderName: string): string {
  // Strip leading numeric prefix (e.g. "02_Onboarding_and_Tax" → "Onboarding and Tax")
  return folderName.replace(/^\d+_/, "").replace(/_/g, " ");
}

function buildFolders(documents: VaultDocument[]): MyFolder[] {
  const map = new Map<string, MyDoc[]>();
  for (const d of documents) {
    if (!map.has(d.folder)) map.set(d.folder, []);
    map.get(d.folder)!.push({
      id: d.id,
      name: d.name,
      date: d.uploaded,
      locked: d.access !== "Employee",
    });
  }
  return Array.from(map.entries()).map(([folderName, docs]) => ({
    id: folderName,
    name: folderName,
    label: folderLabel(folderName),
    docs,
  }));
}

function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DocumentsTab({ documents }: { documents: VaultDocument[] }) {
  const folders = buildFolders(documents);
  const [active, setActive] = React.useState(folders[0]?.id ?? "");
  const folder = folders.find((f) => f.id === active) ?? folders[0];

  const exportButton = (
    <Button
      variant="outline"
      onClick={() =>
        download("my-data-export.json", JSON.stringify(documents, null, 2), "application/json")
      }
    >
      <PackageOpen className="h-4 w-4" /> Export My Data
    </Button>
  );

  if (!folder) {
    return (
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-ink">Filing Cabinet</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Your personal, read-only records. Access them anytime, on any device.
            </p>
          </div>
          {exportButton}
        </div>
        <p className="text-sm text-ink-muted">No documents available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink">Filing Cabinet</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Your personal, read-only records. Access them anytime, on any device.
          </p>
        </div>
        {exportButton}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* Folder list */}
        <Card className="card-pad h-fit">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Folders
          </p>
          <div className="space-y-0.5">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActive(f.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  active === f.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-muted hover:bg-canvas hover:text-ink",
                )}
              >
                <FolderClosed className="h-4 w-4" />
                <span className="flex-1 truncate">{f.label}</span>
                <span className="text-[11px] text-ink-faint">{f.docs.length}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Documents */}
        <div>
          <Card className="card-pad">
            <CardHeader
              title={folder.label}
              action={<span className="font-mono text-[11px] text-ink-faint">{folder.name}/</span>}
            />
            <div className="mt-4 divide-y divide-line">
              {folder.docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-brand-500">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                    <p className="text-xs text-ink-muted">Uploaded {formatDate(d.date)}</p>
                  </div>
                  {d.locked ? (
                    <Badge tone="gray">
                      <Lock className="h-3 w-3" /> Locked until released by HR
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const vd = documents.find((v) => v.id === d.id);
                          const stub = `Document: ${d.name}\nType: ${vd?.type ?? "—"}\nFolder: ${vd?.folder ?? "—"}\nUploaded: ${d.date}`;
                          download(d.name.replace(/\.[^.]+$/, "") + "-preview.txt", stub);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const vd = documents.find((v) => v.id === d.id);
                          const stub = `Document: ${d.name}\nType: ${vd?.type ?? "—"}\nFolder: ${vd?.folder ?? "—"}\nUploaded: ${d.date}`;
                          download(d.name, stub);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-white/60 p-4 text-xs text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              This document is a record for your personal files. If you believe any information is
              inaccurate, please contact the HR Department. To update a document, submit a new copy
              for HR approval.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
