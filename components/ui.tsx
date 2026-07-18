import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn, initials, avatarColor } from "@/lib/utils";

/* ------------------------------- Card ------------------------------- */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {action}
    </div>
  );
}

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
  secondary: "bg-canvas text-ink hover:bg-line",
  ghost: "text-ink-soft hover:bg-canvas",
  danger: "bg-red-500 text-white hover:bg-red-600",
  outline: "border border-line bg-card text-ink-soft hover:bg-canvas",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* ------------------------------- Badge ------------------------------ */

type Tone =
  | "brand"
  | "green"
  | "amber"
  | "red"
  | "sky"
  | "gray"
  | "violet";

const toneStyles: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 dark:text-brand-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  gray: "bg-canvas text-ink-muted",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "gray" }: { tone?: Tone }) {
  const map: Record<Tone, string> = {
    brand: "bg-brand-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    sky: "bg-sky-500",
    gray: "bg-ink-faint",
    violet: "bg-violet-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[tone])} />;
}

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(name),
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ----------------------------- Progress ----------------------------- */

export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "green" | "amber" | "sky";
  className?: string;
}) {
  const map = {
    brand: "bg-brand-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
  };
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-line", className)}>
      <div
        className={cn("h-full rounded-full transition-all", map[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 96,
  stroke = 9,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--brand-100))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-ink">{label ?? `${value}%`}</span>
        {sublabel && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Segmented arc gauge — a 240° arc of rounded ticks, filled up to `value`.
 * The unfilled track uses a lighter step of the brand ramp so state reads
 * across the whole arc in both themes.
 */
export function ArcGauge({
  value,
  size = 148,
  segments = 24,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  segments?: number;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const filled = Math.round((clamped / 100) * segments);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2;
  const rInner = size / 2 - size * 0.135;
  // 240° sweep, opening at the bottom: 210° → -30° in standard math angles.
  const startDeg = 210;
  const sweep = 240;
  const ticks = Array.from({ length: segments }, (_, i) => {
    const deg = startDeg - (i / (segments - 1)) * sweep;
    const rad = (deg * Math.PI) / 180;
    return {
      x1: cx + rInner * Math.cos(rad),
      y1: cy - rInner * Math.sin(rad),
      x2: cx + rOuter * Math.cos(rad),
      y2: cy - rOuter * Math.sin(rad),
      on: i < filled,
    };
  });
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.on ? "hsl(var(--primary))" : "hsl(var(--brand-100))"}
            strokeWidth={size * 0.045}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tracking-tight text-ink">{label ?? `${clamped}%`}</span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Page elements -------------------------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  /** When set, the stat becomes an interactive button (opens a detail view). */
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <Card
      className={cn(
        "card-pad",
        interactive &&
          "group relative cursor-pointer transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
      )}
      {...(interactive
        ? {
            onClick,
            role: "button",
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-ink-muted">
          {tone && <Dot tone={tone} />} {hint}
        </p>
      )}
      {interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 text-ink-faint opacity-0 transition group-hover:opacity-100"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      )}
    </Card>
  );
}

/** Solid color-block fills for VividStat. White text clears 4.5:1 on all of them. */
export type VividTone = "pink" | "green" | "blue" | "orange" | "brand";

const vividFills: Record<VividTone, string> = {
  pink: "bg-pink-600",
  green: "bg-emerald-700",
  blue: "bg-blue-600",
  orange: "bg-orange-700",
  brand: "bg-brand-600",
};

/**
 * Vivid bento stat tile — a solid color block with a big number, in the
 * style of the reference dashboard. Use in small doses (one row).
 */
export function VividStat({
  label,
  value,
  hint,
  tone = "brand",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: VividTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl p-5 text-white shadow-card",
        vividFills[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-white/85">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[32px] font-bold leading-none tracking-tight">{value}</p>
        {hint && <p className="mt-1.5 text-xs font-medium text-white/80">{hint}</p>}
      </div>
    </div>
  );
}

export function ComplianceBadge({
  children = "Bill 149 Compliant",
  variant = "ok",
}: {
  children?: React.ReactNode;
  /** "warn" flips the badge red — e.g. salary data missing on an active posting. */
  variant?: "ok" | "warn";
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        variant === "ok"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "ok" ? "bg-emerald-500" : "bg-red-500",
        )}
      />
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-14 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
    </div>
  );
}
