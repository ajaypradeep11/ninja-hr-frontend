"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, HelpCircle, Sparkles, ArrowLeftRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { AgentDrawer } from "./agent-drawer";
import { currentUser } from "@/lib/data";
import { UserSwitcher, type SwitcherUser } from "./user-switcher";

export function Topbar({
  searchPlaceholder,
  switchHref,
  switchLabel,
  users,
  actor,
}: {
  searchPlaceholder: string;
  switchHref?: string;
  switchLabel?: string;
  users?: SwitcherUser[];
  actor?: SwitcherUser;
}) {
  const [agentOpen, setAgentOpen] = React.useState(false);
  // Question handed in from elsewhere (e.g. the dashboard quick-ask input) —
  // the nonce lets the same question be re-asked and still retrigger.
  const [ask, setAsk] = React.useState<{ q: string; nonce: number } | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAgentOpen((o) => !o);
      }
    }
    function onAsk(e: Event) {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question?.trim();
      setAgentOpen(true);
      if (q) setAsk((prev) => ({ q, nonce: (prev?.nonce ?? 0) + 1 }));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("ninjahr:ask-copilot", onAsk);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ninjahr:ask-copilot", onAsk);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-card/80 px-6 backdrop-blur">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-xl border border-line bg-canvas pl-9 pr-16 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:bg-card"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {switchHref && switchLabel && (
            <Link
              href={switchHref}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink sm:inline-flex"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {switchLabel}
            </Link>
          )}

          <button
            onClick={() => setAgentOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 transition-colors hover:bg-brand-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Live AI Agent</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </button>

          <ThemeToggle />
          <button className="relative rounded-lg p-2 text-ink-muted hover:bg-canvas">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          <button className="rounded-lg p-2 text-ink-muted hover:bg-canvas">
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>

          <div className="ml-1 flex items-center gap-2">
            {users && actor ? (
              <UserSwitcher users={users} current={actor} />
            ) : (
              <Avatar name={currentUser.name} size={32} />
            )}
          </div>
        </div>
      </header>

      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} ask={ask} />
    </>
  );
}
