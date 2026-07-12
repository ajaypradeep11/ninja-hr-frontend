"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CornerDownLeft, FileText, Loader2, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui";
import { adminNav, employeeNav } from "@/lib/nav";
import { getSearchIndex, type SearchIndex } from "@/app/actions/search";
import { cn } from "@/lib/utils";

interface ResultItem {
  key: string;
  group: "Pages" | "Employees" | "Documents";
  label: string;
  sublabel?: string;
  href: string;
  icon?: LucideIcon;
}

/** All-token substring match — "jor hen" finds "Jordan Henderson". */
function matches(haystack: string, tokens: string[]) {
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

/** Rank: primary-field prefix > word prefix > anywhere. Lower is better. */
function rank(primary: string, query: string) {
  const p = primary.toLowerCase();
  if (p.startsWith(query)) return 0;
  if (p.split(/\s+/).some((w) => w.startsWith(query))) return 1;
  return 2;
}

const SECTION_CAP = 8;

/**
 * ⌘K command menu — global search over pages, the employee directory and the
 * document vault. Data comes from the actor-scoped backend endpoints (fetched
 * once per open), so results match what the caller may actually see.
 */
export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  // The employee console has no per-employee pages, so directory results
  // (and admin routes) only render in the admin console.
  const isAdmin = pathname.startsWith("/admin");

  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState<SearchIndex | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    // Waiting for the fetch before focusing loses the user's first keystrokes.
    requestAnimationFrame(() => inputRef.current?.focus());
    let cancelled = false;
    setLoading(true);
    getSearchIndex()
      .then((idx) => {
        if (!cancelled) setIndex(idx);
      })
      .catch(() => {
        if (!cancelled) setIndex({ employees: [], documents: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const results = React.useMemo<ResultItem[]>(() => {
    const navItems = (isAdmin ? adminNav : employeeNav).flatMap((g) => g.items);
    const pages: ResultItem[] = navItems
      .filter((n) => !q || matches(n.label, tokens))
      .map((n) => ({
        key: `page:${n.href}`,
        group: "Pages" as const,
        label: n.label,
        sublabel: n.href,
        href: n.href,
        icon: n.icon,
      }));

    if (!q) return pages;

    const employees: ResultItem[] = isAdmin
      ? (index?.employees ?? [])
          .filter((e) => matches(`${e.name} ${e.title} ${e.department} ${e.email}`, tokens))
          .sort((a, b) => rank(a.name, q) - rank(b.name, q) || a.name.localeCompare(b.name))
          .slice(0, SECTION_CAP)
          .map((e) => ({
            key: `emp:${e.id}`,
            group: "Employees" as const,
            label: e.name,
            sublabel: `${e.title} · ${e.department}`,
            href: `/admin/employees/${e.id}`,
          }))
      : [];

    const documents: ResultItem[] = (index?.documents ?? [])
      .filter((d) => matches(`${d.name} ${d.type} ${d.folder}`, tokens))
      .sort((a, b) => rank(a.name, q) - rank(b.name, q) || a.name.localeCompare(b.name))
      .slice(0, SECTION_CAP)
      .map((d) => ({
        key: `doc:${d.id}`,
        group: "Documents" as const,
        label: d.name,
        sublabel: `${d.folder} · ${d.type}`,
        href: isAdmin ? "/admin/documents" : "/employee/documents",
        icon: FileText,
      }));

    return [...employees, ...documents, ...pages.slice(0, 4)];
  }, [q, tokens, index, isAdmin]);

  React.useEffect(() => setActive(0), [q]);

  function go(item: ResultItem) {
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // Keep the active row visible while arrowing through a long list.
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;


  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-x-0 top-[18vh] z-50 mx-auto w-full max-w-xl px-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-pop">
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isAdmin ? "Search employees, documents, pages…" : "Search documents, pages…"}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />}
            <kbd className="shrink-0 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
              esc
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-ink-muted">
                {loading ? "Loading…" : `No results for “${query}”`}
              </p>
            )}
            {results.map((item, i) => {
              // Group heading renders on the first item of each group (no render-scope mutation).
              const heading = i === 0 || results[i - 1].group !== item.group ? item.group : null;
              const Icon = item.icon;
              return (
                <React.Fragment key={item.key}>
                  {heading && (
                    <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                      {heading}
                    </p>
                  )}
                  <button
                    data-index={i}
                    onClick={() => go(item)}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      i === active
                        ? "bg-brand-50 text-brand-700 dark:text-brand-400"
                        : "text-ink-soft hover:bg-canvas",
                    )}
                  >
                    {item.group === "Employees" ? (
                      <Avatar name={item.label} size={24} />
                    ) : Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-ink-muted">{item.sublabel}</span>
                      )}
                    </span>
                    {i === active && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
