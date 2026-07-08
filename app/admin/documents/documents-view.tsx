"use client";

import * as React from "react";
import {
  Folder,
  FolderLock,
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

interface DocumentsViewProps {
  initialDocFolders: DocFolder[];
  initialVaultDocuments: VaultDocument[];
}

export function DocumentsView({ initialDocFolders, initialVaultDocuments }: DocumentsViewProps) {
  const [role, setRole] = React.useState<Role>("HR Admin");
  const [selected, setSelected] = React.useState<string>(initialDocFolders[0]?.name ?? "");
  const [openDocId, setOpenDocId] = React.useState<string | null>(null);

  const visibleFolders = initialDocFolders.filter((f) => canSeeFolder(role, f.name));

  // If current selection becomes hidden after a role switch, fall back.
  React.useEffect(() => {
    if (!visibleFolders.some((f) => f.name === selected)) {
      setSelected(visibleFolders[0]?.name ?? "");
      setOpenDocId(null);
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const folderDocs = initialVaultDocuments.filter((d) => d.folder === selected);
  const openDoc = initialVaultDocuments.find((d) => d.id === openDocId) ?? null;

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
                  <span className="text-[11px] text-ink-faint">{f.count}</span>
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
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-card py-8 text-center transition-colors hover:border-brand-300">
            <UploadCloud className="h-7 w-7 text-brand-400" />
            <p className="mt-2 text-sm font-semibold text-ink">
              Drop files to upload
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              PDF, JPEG, PNG, DOCX — auto-routed to the right folder by workflow context.
            </p>
          </div>

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
