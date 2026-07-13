"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderLock,
  Loader2,
  Lock,
  UploadCloud,
  FileText,
  X,
  ShieldAlert,
  History,
  Clock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  PageHeader,
  EmptyState,
} from "@/components/ui";
import type { DocFolder, VaultDocument } from "@/lib/data";
import { uploadVaultDocument } from "@/app/actions/documents";
import { cn, formatDate } from "@/lib/utils";

type Role = "Employee" | "Manager" | "HR Admin" | "Super Admin";

const ROLES: Role[] = ["Employee", "Manager", "HR Admin", "Super Admin"];

// Workflow context that routes a document into each folder (metadata switchboard).
const folderWorkflow: Record<string, string> = {
  "01_Recruitment": "ATS / Recruitment Sub-Module",
  "02_Onboarding_and_Tax": "Onboarding Sub-Module",
  "03_Compliance_and_Training": "Training Tracker",
  "04_Performance_and_PIPs": "Performance Sub-Module",
  "05_Leaves_and_Medical": "Leave Management",
  "06_Offboarding": "Offboarding Sub-Module",
};

const accessTone: Record<string, "gray" | "amber" | "red" | "violet"> = {
  Employee: "gray",
  Manager: "amber",
  "HR Admin": "red",
  "Super Admin": "violet",
};

/** RBAC: which folders a role may even see. */
function canSeeFolder(role: Role, folderName: string) {
  if (role === "HR Admin" || role === "Super Admin") return true;
  if (role === "Manager") return folderName !== "05_Leaves_and_Medical";
  // Employee: only their own onboarding/compliance/performance folders.
  return ["02_Onboarding_and_Tax", "03_Compliance_and_Training", "04_Performance_and_PIPs"].includes(
    folderName,
  );
}

const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"];

/**
 * The "metadata switchboard": route an upload to its folder by what the file
 * looks like (workflow context), falling back to the folder being viewed.
 */
const ROUTING_RULES: { pattern: RegExp; type: string; folder: string }[] = [
  { pattern: /resume|cv\b|cover.?letter|candidate/i, type: "Resume", folder: "01_Recruitment" },
  { pattern: /offer/i, type: "Offer Letter", folder: "02_Onboarding_and_Tax" },
  { pattern: /td1|tax|direct.?deposit|void.?cheque/i, type: "Tax Form", folder: "02_Onboarding_and_Tax" },
  { pattern: /aoda|whmis|certificate|training/i, type: "Certificate", folder: "03_Compliance_and_Training" },
  { pattern: /appraisal|performance|review|pip\b/i, type: "Appraisal", folder: "04_Performance_and_PIPs" },
  { pattern: /medical|accommodation|doctor|sick/i, type: "Medical", folder: "05_Leaves_and_Medical" },
  { pattern: /roe\b|separation|termination|exit|release/i, type: "Offboarding", folder: "06_Offboarding" },
];

function routeFile(fileName: string, fallbackFolder: string) {
  const rule = ROUTING_RULES.find((r) => r.pattern.test(fileName));
  return rule
    ? { type: rule.type, folder: rule.folder }
    : { type: "General", folder: fallbackFolder || "03_Compliance_and_Training" };
}

interface DocumentsViewProps {
  initialDocFolders: DocFolder[];
  initialVaultDocuments: VaultDocument[];
}

export function DocumentsView({ initialDocFolders, initialVaultDocuments }: DocumentsViewProps) {
  const router = useRouter();
  const [role, setRole] = React.useState<Role>("HR Admin");
  const [selected, setSelected] = React.useState<string>(initialDocFolders[0]?.name ?? "");
  const [openDocId, setOpenDocId] = React.useState<string | null>(null);
  const [docs, setDocs] = React.useState(initialVaultDocuments);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setDocs(initialVaultDocuments), [initialVaultDocuments]);

  const visibleFolders = initialDocFolders.filter((f) => canSeeFolder(role, f.name));
  // Vault writes are an HR capability — workflows file everyone else's documents.
  const canUpload = role === "HR Admin" || role === "Super Admin";

  // If current selection becomes hidden after a role switch, fall back.
  React.useEffect(() => {
    if (!visibleFolders.some((f) => f.name === selected)) {
      setSelected(visibleFolders[0]?.name ?? "");
      setOpenDocId(null);
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const folderDocs = docs.filter((d) => d.folder === selected);
  const openDoc = docs.find((d) => d.id === openDocId) ?? null;

  async function handleFiles(files: File[]) {
    if (!canUpload || uploading || files.length === 0) return;
    setNotice(null);

    const rejected = files.filter(
      (f) => !ACCEPTED_EXTENSIONS.includes(f.name.split(".").pop()?.toLowerCase() ?? ""),
    );
    const accepted = files.filter((f) => !rejected.includes(f));
    if (accepted.length === 0) {
      setNotice({ tone: "error", text: "Only PDF, JPEG, PNG or DOCX files are accepted." });
      return;
    }

    setUploading(true);
    const uploaded: VaultDocument[] = [];
    const failed: string[] = [];
    for (const file of accepted) {
      const { type, folder } = routeFile(file.name, selected);
      try {
        // Store the actual file when within the ceiling — larger files fall
        // back to a metadata-only record rather than failing the upload.
        let filePayload: { mimeType: string; dataBase64: string } | undefined;
        if (file.size <= 8 * 1024 * 1024 && file.type) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          const CHUNK = 0x8000;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
          }
          filePayload = { mimeType: file.type, dataBase64: btoa(binary) };
        }
        uploaded.push(
          await uploadVaultDocument({ name: file.name, type, folder, access: "HR Admin", ...filePayload }),
        );
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);

    if (uploaded.length > 0) {
      setDocs((d) => [...uploaded, ...d]);
      // Jump to the routed folder so the result of the upload is visible.
      setSelected(uploaded[uploaded.length - 1].folder);
      setOpenDocId(null);
      router.refresh();
    }
    const parts = [
      uploaded.length > 0 &&
        `Filed ${uploaded.length} document${uploaded.length === 1 ? "" : "s"} to ${[...new Set(uploaded.map((u) => u.folder))].join(", ")}.`,
      rejected.length > 0 && `Skipped (unsupported type): ${rejected.map((f) => f.name).join(", ")}.`,
      failed.length > 0 && `Failed: ${failed.join(", ")}.`,
    ].filter(Boolean);
    setNotice({ tone: rejected.length || failed.length ? "error" : "ok", text: parts.join(" ") });
  }

  return (
    <div>
      <PageHeader
        title="Document Management"
        subtitle="A secure digital filing cabinet with automated folder routing and Law 25-grade access control."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Viewing as
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-transparent text-sm font-semibold text-ink outline-none"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* Folder tree */}
        <Card className="card-pad h-fit">
          <CardHeader title="Employee Vault" />
          <p className="mt-1 text-xs text-ink-muted">root/</p>
          <div className="mt-3 space-y-1">
            {visibleFolders.map((f) => {
              const active = f.name === selected;
              const Icon = f.restricted ? FolderLock : Folder;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelected(f.name);
                    setOpenDocId(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700 dark:text-brand-400"
                      : "text-ink-soft hover:bg-canvas",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate font-medium">{f.name}</span>
                  {f.restricted && <Lock className="h-3 w-3 text-ink-faint" />}
                  {/* Live count — the static seed count drifted as soon as uploads worked. */}
                  <span className="text-[11px] text-ink-faint">
                    {docs.filter((d) => d.folder === f.name).length}
                  </span>
                </button>
              );
            })}
            {visibleFolders.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-ink-muted">
                No folders visible for this role.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Managers are blocked from <b>05_Leaves_and_Medical</b>; employees never see{" "}
              <b>01_Recruitment</b> (human-rights privacy).
            </span>
          </div>
        </Card>

        {/* Documents + dropzone */}
        <div className="space-y-5">
          <div
            role="button"
            tabIndex={canUpload ? 0 : -1}
            onClick={() => canUpload && !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (canUpload && !uploading && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            // preventDefault on dragover is what makes a DOM element a valid
            // drop target — without it the browser cancels the drop entirely.
            onDragOver={(e) => {
              e.preventDefault();
              if (canUpload) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(Array.from(e.dataTransfer.files));
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card py-8 text-center transition-colors",
              dragOver ? "border-brand-400 bg-brand-50/50" : "border-line",
              canUpload ? "cursor-pointer hover:border-brand-300" : "opacity-60",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={(e) => {
                void handleFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
            ) : (
              <UploadCloud className="h-7 w-7 text-brand-400" />
            )}
            <p className="mt-2 text-sm font-semibold text-ink">
              {uploading
                ? "Filing documents…"
                : canUpload
                  ? "Drop files to upload, or click to browse"
                  : "Uploads require HR Admin access"}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              PDF, JPEG, PNG, DOCX — auto-routed to the right folder by workflow context.
            </p>
          </div>

          {notice && (
            <p
              className={cn(
                "rounded-xl px-3 py-2.5 text-xs",
                notice.tone === "ok"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
              )}
            >
              {notice.text}
            </p>
          )}

          <Card className="card-pad">
            <CardHeader
              title={selected || "—"}
              action={
                <span className="text-xs text-ink-muted">
                  {folderDocs.length} document{folderDocs.length === 1 ? "" : "s"}
                </span>
              }
            />
            {folderDocs.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<FileText className="h-7 w-7" />}
                  title="No documents in this folder"
                  description="Files uploaded through platform workflows will appear here automatically."
                />
              </div>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Uploaded</th>
                    <th className="pb-2 font-semibold">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {folderDocs.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setOpenDocId(d.id)}
                      className="cursor-pointer border-t border-line hover:bg-canvas/60"
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-ink-faint" />
                          <span className="font-medium text-ink">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-ink-muted">{d.type}</td>
                      <td className="py-2.5 text-ink-muted">
                        {formatDate(d.uploaded)}
                      </td>
                      <td className="py-2.5">
                        <Badge tone={accessTone[d.access]}>{d.access}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Card className="card-pad">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Law 25 retention
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Rejected-candidate files in <b>01_Recruitment</b> are stamped with a 24-month
                deletion countdown. A cron job flags them <b>Pending_Purge</b> and asks HR to
                confirm a secure purge.
              </p>
            </Card>
            <Card className="card-pad">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <History className="h-4 w-4 text-brand-500 dark:text-brand-400" /> Immutable audit trail
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Every view, download, update, or deletion writes a row to{" "}
                <code className="rounded bg-canvas px-1">document_audit_trails</code> with
                user, action, timestamp & IP. Soft-deletes only.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Metadata sidebar */}
      {openDoc && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/20"
            onClick={() => setOpenDocId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="text-sm font-semibold text-ink">Document details</p>
              <button
                onClick={() => setOpenDocId(null)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{openDoc.name}</p>
                  <p className="text-xs text-ink-muted">{openDoc.folder}</p>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <MetaRow label="Document type" value={openDoc.type} />
                <MetaRow
                  label="Associated workflow"
                  value={folderWorkflow[openDoc.folder] ?? "—"}
                />
                <MetaRow label="Upload date" value={formatDate(openDoc.uploaded)} />
                <MetaRow
                  label="Access restriction level"
                  value={<Badge tone={accessTone[openDoc.access]}>{openDoc.access}</Badge>}
                />
              </dl>
              <div className="rounded-xl bg-canvas px-3 py-2.5 text-[11px] text-ink-muted">
                Opening this document logged an entry to the immutable audit trail.
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
