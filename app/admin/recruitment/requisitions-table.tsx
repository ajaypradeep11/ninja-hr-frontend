"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatCAD } from "@/lib/utils";
import type { Requisition } from "@/lib/data";
import { archiveRequisition, deleteRequisition } from "@/app/actions/recruitment";

const statusTone = {
  Draft: "gray",
  "Pending Approval": "amber",
  Approved: "sky",
  Published: "green",
} as const;

export function RequisitionsTable({ requisitions }: { requisitions: Requisition[] }) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = showArchived ? requisitions : requisitions.filter((r) => !r.archived);
  const archivedCount = requisitions.filter((r) => r.archived).length;

  function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Active Requisitions</h3>
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-semibold text-ink-muted hover:text-ink"
          >
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* Independent scroll container — the table scrolls on its own while the
          Top Candidates sidebar stays sticky in the viewport. */}
      <div className="mt-3 max-h-[540px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
              <th className="pb-2 font-semibold">Role</th>
              <th className="pb-2 font-semibold">Type</th>
              <th className="pb-2 font-semibold">Salary range</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 text-right font-semibold">Applicants</th>
              <th className="pb-2 text-right font-semibold sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-line align-middle ${r.archived ? "opacity-60" : ""}`}
              >
                <td className="py-3">
                  <Link
                    href={`/admin/recruitment/${r.id}`}
                    className="font-semibold text-ink hover:text-brand-600"
                  >
                    {r.title}
                  </Link>
                  {r.archived && (
                    <Badge tone="gray" className="ml-2 align-middle">
                      Archived
                    </Badge>
                  )}
                  <p className="text-xs text-ink-muted">{r.department}</p>
                </td>
                <td className="py-3 text-ink-muted">{r.type}</td>
                <td className="py-3 text-ink-muted">
                  {formatCAD(r.salaryMin, { maximumFractionDigits: 0 })} –{" "}
                  {formatCAD(r.salaryMax, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-3">
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </td>
                <td className="py-3 text-right">
                  {r.applicants > 0 ? (
                    <span className="font-semibold text-ink">{r.applicants}</span>
                  ) : (
                    <span className="text-xs text-ink-faint">None yet</span>
                  )}
                </td>
                <td className="py-3 pl-2 text-right">
                  <RowMenu
                    req={r}
                    busy={pending && busyId === r.id}
                    onArchive={() =>
                      run(r.id, () => archiveRequisition(r.id, !r.archived))
                    }
                    onDelete={() => run(r.id, () => deleteRequisition(r.id))}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-xs text-ink-muted">
                  No active requisitions. Create one to start hiring.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowMenu({
  req,
  busy,
  onArchive,
  onDelete,
}: {
  req: Requisition;
  busy: boolean;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={`Actions for ${req.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          <Link
            href={`/admin/recruitment/${req.id}/edit`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-canvas"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
          >
            {req.archived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" /> Archive
              </>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              if (
                window.confirm(
                  `Permanently delete "${req.title}"? This removes the requisition and all its applications. This cannot be undone.`,
                )
              ) {
                onDelete();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
