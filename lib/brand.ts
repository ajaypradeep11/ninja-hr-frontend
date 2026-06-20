/**
 * Single source of truth for product branding.
 * Swap `name` here to rebrand the whole app (TestHR -> final name).
 */
export const BRAND = {
  name: "TestHR",
  tagline: "Agentic HR for the Canadian market",
  adminConsoleLabel: "ADMIN CONSOLE",
  employeeConsoleLabel: "EMPLOYEE PORTAL",
  // "today" is fixed so the prototype renders deterministically.
  today: "2026-06-18",
} as const;
