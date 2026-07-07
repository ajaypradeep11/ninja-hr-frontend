/**
 * Single source of truth for product branding.
 * Swap `name` here to rebrand the whole app (TestHR -> final name).
 */
export const BRAND = {
  name: "TestHR",
  tagline: "Agentic HR for the Canadian market",
  adminConsoleLabel: "ADMIN CONSOLE",
  employeeConsoleLabel: "EMPLOYEE PORTAL",
  // Real current date — compliance logic (training deadlines, Bill 149 ghosting
  // windows, probation watchlists) must not run against a frozen clock.
  today: new Date().toISOString().slice(0, 10),
} as const;
