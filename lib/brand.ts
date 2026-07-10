/**
 * Single source of truth for product branding.
 */
export const BRAND = {
  name: "NinjaHR",
  tagline: "Agentic HR for the Canadian market",
  adminConsoleLabel: "ADMIN CONSOLE",
  employeeConsoleLabel: "EMPLOYEE PORTAL",
  // Real current date — compliance logic (training deadlines, Bill 149 ghosting
  // windows, probation watchlists) must not run against a frozen clock.
  today: new Date().toISOString().slice(0, 10),
} as const;
