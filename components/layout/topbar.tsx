"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, Sparkles, ArrowLeftRight, LogOut, UserX } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { AgentDrawer } from "./agent-drawer";
import { CommandMenu } from "./command-menu";
import { clearActor } from "@/app/actions/identity";
import { signOutSession } from "@/app/actions/auth";
import { UserSwitcher, type SwitcherUser } from "./user-switcher";
import { cn } from "@/lib/utils";

/** Avatar wrapped in a small dropdown — currently just houses "Sign out". */
function AvatarMenu({ name }: { name: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOutSession();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="block rounded-full" title={name}>
        <Avatar name={name} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-line bg-card p-2 shadow-pop">
          <button
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5 text-ink-faint" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({
  searchPlaceholder,
  switchHref,
  switchLabel,
  users,
  actor,
  realIsAdmin,
}: {
  searchPlaceholder: string;
  switchHref?: string;
  switchLabel?: string;
  users?: SwitcherUser[];
  actor?: SwitcherUser;
  /** Whether the *real* signed-in user (ignoring impersonation) is HR_ADMIN — gates the switcher. */
  realIsAdmin?: boolean;
}) {
  const router = useRouter();
  const [agentOpen, setAgentOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const impersonating = !!actor && actor.realUserId != null && actor.realUserId !== actor.id;

  async function stopImpersonating() {
    if (stopping) return;
    setStopping(true);
    try {
      await clearActor();
      router.push("/admin");
      router.refresh();
    } finally {
      setStopping(false);
    }
  }
  // Question handed in from elsewhere (e.g. the dashboard quick-ask input) —
  // the nonce lets the same question be re-asked and still retrigger.
  const [ask, setAsk] = React.useState<{ q: string; nonce: number } | null>(null);

  React.useEffect(() => {
    // ⌘K is the command menu (global search); the AI drawer keeps its own
    // button + the ninjahr:ask-copilot event.
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
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
        {/* Trigger only — a real input here invited typing that went nowhere;
            all searching happens inside the ⌘K command menu. */}
        <button
          onClick={() => setSearchOpen(true)}
          className="relative w-full max-w-md rounded-xl border border-line bg-canvas py-2 pl-9 pr-16 text-left text-sm text-ink-faint transition hover:border-brand-300 hover:bg-card"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          {searchPlaceholder}
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
            ⌘K
          </kbd>
        </button>

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
          <Link
            href="/help"
            target="_blank"
            rel="noopener"
            title="Help Center"
            className="rounded-lg p-2 text-ink-muted hover:bg-canvas"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </Link>

          <div className="ml-1 flex items-center gap-2">
            {impersonating && (
              <button
                onClick={stopImpersonating}
                disabled={stopping}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
                )}
                title="Return to your own account"
              >
                <UserX className="h-3.5 w-3.5" />
                Viewing as {actor?.name} — Stop
              </button>
            )}

            {users && actor && realIsAdmin ? (
              <UserSwitcher users={users} current={actor} />
            ) : null}

            {actor ? <AvatarMenu name={actor.name} /> : <Avatar name="?" size={32} />}
          </div>
        </div>
      </header>

      <CommandMenu open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} ask={ask} />
    </>
  );
}
