"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui";
import { setActor } from "@/app/actions/identity";
import { cn } from "@/lib/utils";

export interface SwitcherUser {
  id: string;
  name: string;
  title: string;
  department: string;
  role: string;
  roleCode: "HR_ADMIN" | "MANAGER" | "EMPLOYEE";
}

const roleTone: Record<SwitcherUser["roleCode"], string> = {
  HR_ADMIN: "bg-brand-50 text-brand-700",
  MANAGER: "bg-violet-50 text-violet-700",
  EMPLOYEE: "bg-canvas text-ink-muted",
};

/** Demo login switcher — role gating is enforced server-side; this only picks who you are. */
export function UserSwitcher({ users, current }: { users: SwitcherUser[]; current: SwitcherUser }) {
  const router = useRouter();
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

  async function pick(u: SwitcherUser) {
    if (u.id === current.id || busy) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await setActor(u.id);
      // Land each role on its console; the layouts also enforce this server-side.
      router.push(u.roleCode === "HR_ADMIN" ? "/admin" : "/employee");
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-canvas"
        title="Switch user (demo)"
      >
        <Avatar name={current.name} size={32} />
        <span className="hidden text-left md:block">
          <span className="block text-xs font-semibold leading-tight text-ink">{current.name}</span>
          <span className="block text-[10px] leading-tight text-ink-faint">{current.role}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-pop">
          <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            <UserRound className="h-3 w-3" /> Sign in as (demo)
          </p>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => pick(u)}
              disabled={busy}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-canvas disabled:opacity-50",
                u.id === current.id && "bg-brand-50/60",
              )}
            >
              <Avatar name={u.name} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{u.name}</span>
                <span className="block truncate text-[11px] text-ink-muted">
                  {u.title} · {u.department}
                </span>
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", roleTone[u.roleCode])}>
                {u.role}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
