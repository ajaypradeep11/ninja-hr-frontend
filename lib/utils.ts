import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as CAD currency. */
export function formatCAD(value: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    ...opts,
  }).format(value);
}

/** Format an ISO date string into a short, readable form. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

/** Whole days between two ISO dates (b - a). Negative if b is before a. */
export function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso + "T00:00:00").getTime();
  const b = new Date(bIso + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Initials from a full name, e.g. "Sarah Chen" -> "SC". */
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic avatar background color from a string seed. */
export function avatarColor(seed: string) {
  const palette = [
    "#0b88d5",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
