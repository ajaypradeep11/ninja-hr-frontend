"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import {
  adminNav,
  employeeNav,
  interviewsNavItem,
  managerRecruitmentNav,
  myProfileNavItem,
  type NavGroup,
} from "@/lib/nav";

export function Sidebar({
  variant,
  consoleLabel,
  homeHref,
  ctaLabel,
  ctaHref,
  showRecruitment = false,
  showInterviews = false,
  showOnboarding = true,
}: {
  variant: "admin" | "employee";
  consoleLabel: string;
  homeHref: string;
  /** Optional primary action. Omit it and pages own their primary CTAs instead. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Adds the Recruitment group to the employee console (managers + HR only). */
  showRecruitment?: boolean;
  /** Adds a "My Interviews" item for hiring-team members (any role). */
  showInterviews?: boolean;
  /** False once onboarding is complete — "Onboarding" becomes "My Profile". */
  showOnboarding?: boolean;
}) {
  const pathname = usePathname();
  const nav = React.useMemo(() => {
    if (variant === "admin") return adminNav;
    // Base employee nav; splice in the recruitment group and/or interviews item.
    let items = showOnboarding
      ? employeeNav[0].items
      : employeeNav[0].items.map((i) => (i.href === "/employee/onboarding" ? myProfileNavItem : i));
    if (showInterviews) items = [...items, interviewsNavItem];
    const primary: typeof employeeNav[number] = { ...employeeNav[0], items };
    const rest = employeeNav.slice(1);
    return showRecruitment ? [primary, managerRecruitmentNav, ...rest] : [primary, ...rest];
  }, [variant, showRecruitment, showInterviews, showOnboarding]);

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-card">
      <Link href={homeHref} className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <BrandMark consoleLabel={consoleLabel} />
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {nav.map((group, gi) =>
          group.collapsible ? (
            <CollapsibleGroup key={gi} group={group} isActive={isActive} />
          ) : (
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
          ),
        )}
      </nav>

      <div className="space-y-1 px-3 pb-4 pt-2">
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="mb-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </Link>
        )}
        <Link href="#" className="nav-link">
          <LifeBuoy className="h-[18px] w-[18px]" />
          Support
        </Link>
      </div>
    </aside>
  );
}

/** Accordion nav group — the heading is a clickable toggle with a chevron. */
function CollapsibleGroup({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const hasActiveChild = group.items.some((i) => isActive(i.href));
  // Start expanded when a child route is active so the user sees where they are.
  const [open, setOpen] = React.useState(hasActiveChild);
  React.useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const GroupIcon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          hasActiveChild ? "text-brand-700 dark:text-brand-400" : "text-ink-soft hover:bg-canvas",
        )}
      >
        {GroupIcon && <GroupIcon className="h-[18px] w-[18px]" />}
        <span className="flex-1 text-left">{group.heading}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-ink-faint transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-3">
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
      )}
    </div>
  );
}
