"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  getToolAccess,
  setToolEnabled,
  setToolGrants,
  type ToolAccessView,
  type ToolLibraryView,
  type ToolListItem,
} from "@/app/actions/tools";

export function ToolsView({ initial }: { initial: ToolLibraryView }) {
  const [tools, setTools] = React.useState(initial.tools);
  const [accessTool, setAccessTool] = React.useState<ToolListItem | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const order: string[] = [];
    for (const t of tools) if (!order.includes(t.category)) order.push(t.category);
    return order;
  }, [tools]);

  async function toggle(tool: ToolListItem) {
    const next = !tool.enabled;
    // Optimistic flip; roll back on failure.
    setTools((ts) => ts.map((t) => (t.slug === tool.slug ? { ...t, enabled: next, canRun: next } : t)));
    try {
      await setToolEnabled(tool.slug, next);
      setError(null);
    } catch (e) {
      setTools((ts) =>
        ts.map((t) => (t.slug === tool.slug ? { ...t, enabled: !next, canRun: !next } : t)),
      );
      setError(e instanceof Error ? e.message : "Could not update the tool.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Tool Library"
        subtitle="Premium AI agents that plug into your existing workflows — enable them company-wide and assign access per user."
        action={
          <Badge tone="violet" className="px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> Premium add-on
          </Badge>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
                {category}
              </h2>
              <span className="text-xs text-ink-faint">
                {tools.filter((t) => t.category === category).length} tools
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tools
                .filter((t) => t.category === category)
                .map((tool) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    onToggle={() => toggle(tool)}
                    onManageAccess={() => setAccessTool(tool)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      {accessTool && (
        <AccessModal
          tool={accessTool}
          onClose={() => setAccessTool(null)}
          onSaved={(count) =>
            setTools((ts) =>
              ts.map((t) => (t.slug === accessTool.slug ? { ...t, grantCount: count } : t)),
            )
          }
        />
      )}
    </div>
  );
}

function ToolCard({
  tool,
  onToggle,
  onManageAccess,
}: {
  tool: ToolListItem;
  onToggle: () => void;
  onManageAccess: () => void;
}) {
  const openHref = tool.kind === "BUILTIN" ? tool.href ?? "#" : `/admin/tools/${tool.slug}`;
  return (
    <Card className={cn("card-pad flex flex-col gap-3", !tool.enabled && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold text-ink">{tool.name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {tool.kind === "BUILTIN" ? (
              <Badge tone="sky">Built-in</Badge>
            ) : (
              <Badge tone="violet">
                <Sparkles className="h-3 w-3" /> AI Agent
              </Badge>
            )}
            {!tool.enabled && (
              <Badge tone="gray">
                <Lock className="h-3 w-3" /> Disabled
              </Badge>
            )}
            {tool.kind === "PROMPT" && tool.grantCount > 0 && (
              <Badge tone="green">
                <ShieldCheck className="h-3 w-3" /> {tool.grantCount} user
                {tool.grantCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <EnabledSwitch enabled={tool.enabled} onToggle={onToggle} />
      </div>

      <p className="flex-1 text-[13px] leading-relaxed text-ink-muted">{tool.description}</p>

      <div className="flex items-center gap-2">
        {tool.enabled ? (
          <Link
            href={openHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand-500 px-3 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
          >
            {tool.kind === "BUILTIN" ? "Open" : "Run tool"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-xs text-ink-faint">Enable to use this tool</span>
        )}
        {tool.kind === "PROMPT" && (
          <Button variant="outline" size="sm" onClick={onManageAccess}>
            <UserPlus className="h-3.5 w-3.5" /> Manage access
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Company-wide on/off switch (Super Admin). */
function EnabledSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable tool company-wide" : "Enable tool company-wide"}
      onClick={onToggle}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
        enabled ? "bg-brand-500" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
          enabled ? "left-[22px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

/** Per-user grant management (RBAC assignment to managers/secondary users). */
function AccessModal({
  tool,
  onClose,
  onSaved,
}: {
  tool: ToolListItem;
  onClose: () => void;
  onSaved: (grantCount: number) => void;
}) {
  const [access, setAccess] = React.useState<ToolAccessView | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    getToolAccess(tool.slug)
      .then((a) => {
        if (!alive) return;
        setAccess(a);
        setSelected(new Set(a.grantedUserIds));
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load users."));
    return () => {
      alive = false;
    };
  }, [tool.slug]);

  async function save() {
    setSaving(true);
    try {
      const res = await setToolGrants(tool.slug, [...selected]);
      onSaved(res.grantedUserIds.length);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-bold text-ink">Manage access — {tool.name}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Grant this tool to managers or employees. HR admins always have full access.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {!access && !error && (
            <div className="flex items-center gap-2 py-8 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
            </div>
          )}
          {access && access.users.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-muted">
              No managers or employees to grant yet.
            </p>
          )}
          {access?.users.map((u) => {
            const checked = selected.has(u.userId);
            return (
              <label
                key={u.userId}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (checked) next.delete(u.userId);
                      else next.add(u.userId);
                      return next;
                    })
                  }
                  className="h-4 w-4 rounded border-line accent-[var(--brand-500,#0b88d5)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{u.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {u.title} · {u.department}
                  </span>
                </span>
                <Badge tone={u.role === "MANAGER" ? "brand" : "gray"}>{u.role}</Badge>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-xs text-ink-muted">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !access}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
