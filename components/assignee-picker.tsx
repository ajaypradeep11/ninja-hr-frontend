"use client";

import * as React from "react";
import { Check, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DirectoryEntry {
  name: string;
  department: string;
  title: string;
}

/**
 * Shared "Assign owner" control for department task blocks (Onboarding +
 * Offboarding). Renders the current assignee as a clean avatar tag and a
 * compact, searchable popover — home-department people are suggested first and
 * the list is height-capped so it never runs off the page like a native
 * <select> stuffed with the whole company directory.
 */
export function AssigneePicker({
  assignee,
  homeDept,
  directory,
  onAssign,
  disabled = false,
}: {
  assignee: string | null;
  homeDept: string | null;
  directory: DirectoryEntry[];
  onAssign: (name: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close on outside-click / Escape.
  React.useEffect(() => {
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

  // Focus the search box as soon as the popover opens.
  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function toggleOpen() {
    setOpen((v) => {
      if (!v) setQuery(""); // fresh search each time it opens
      return !v;
    });
  }

  const byName = (a: DirectoryEntry, b: DirectoryEntry) => a.name.localeCompare(b.name);
  const matches = (e: DirectoryEntry) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${e.name} ${e.title} ${e.department}`.toLowerCase().includes(q);
  };
  const suggested = (homeDept ? directory.filter((e) => e.department === homeDept) : [])
    .filter(matches)
    .sort(byName);
  const others = directory
    .filter((e) => !homeDept || e.department !== homeDept)
    .filter(matches)
    .sort(byName);
  const hasResults = suggested.length > 0 || others.length > 0;

  function choose(name: string | null) {
    onAssign(name);
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const first = suggested[0] ?? others[0];
      if (first) choose(first.name);
    }
  }

  const Row = ({ e }: { e: DirectoryEntry }) => (
    <button
      type="button"
      role="option"
      aria-selected={e.name === assignee}
      onClick={() => choose(e.name)}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-canvas"
    >
      <Avatar name={e.name} size={22} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">{e.name}</span>
        <span className="block truncate text-[10px] text-ink-faint">
          {e.title} · {e.department}
        </span>
      </span>
      {e.name === assignee && <Check className="h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-400" />}
    </button>
  );

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2">
      {assignee && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas py-0.5 pl-0.5 pr-2.5 text-[11px] font-medium text-ink-soft">
          <Avatar name={assignee} size={18} />
          {assignee}
        </span>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-card px-2 text-[11px] font-semibold text-ink-soft outline-none transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
      >
        {assignee ? (
          "Reassign"
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" /> Assign
          </>
        )}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-card shadow-lg"
        >
          <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search people…"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {assignee && (
              <button
                type="button"
                onClick={() => choose(null)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20"
              >
                <span className="flex h-[22px] w-[22px] items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </span>
                Unassign
              </button>
            )}

            {suggested.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Suggested · {homeDept}
                </p>
                {suggested.map((e) => (
                  <Row key={e.name} e={e} />
                ))}
              </>
            )}

            {others.length > 0 && (
              <>
                <p
                  className={cn(
                    "px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint",
                    suggested.length > 0 ? "pt-1.5" : "pt-1",
                  )}
                >
                  {suggested.length > 0 ? "Other people" : "All people"}
                </p>
                {others.map((e) => (
                  <Row key={e.name} e={e} />
                ))}
              </>
            )}

            {!hasResults && (
              <p className="px-2.5 py-4 text-center text-xs text-ink-muted">
                No one matches “{query}”.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
