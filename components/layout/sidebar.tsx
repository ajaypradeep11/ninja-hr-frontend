"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Sparkles, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { adminNav, employeeNav } from "@/lib/nav";

export function Sidebar({
  variant,
  consoleLabel,
  homeHref,
  ctaLabel,
  ctaHref,
}: {
  variant: "admin" | "employee";
  consoleLabel: string;
  homeHref: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const pathname = usePathname();
  const nav = variant === "admin" ? adminNav : employeeNav;

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-white">
      <Link href={homeHref} className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold text-brand-700">{BRAND.name}</span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            {consoleLabel}
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-link", active && "nav-link-active")}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-4 pt-2">
        <Link
          href={ctaHref}
          className="mb-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </Link>
        <Link href="#" className="nav-link">
          <LifeBuoy className="h-[18px] w-[18px]" />
          Support
        </Link>
      </div>
    </aside>
  );
}
