// Shared e2e auth helpers: resolving seeded users' login emails and driving
// the /login form. `/identity/users` carries roleCode but no email;
// `/people/employees` carries email but no roleCode — so resolving a real
// address means joining the two over employeeId rather than hardcoding one
// that would drift if the seed data ever changes.
import type { Page } from "@playwright/test";

const API_URL = process.env.NINJA_HR_API_URL ?? "http://localhost:4000/api/v1";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "dev-internal-key";
const HEADERS = { "x-internal-key": INTERNAL_KEY, "x-actor-persona": "admin" };

export const DEMO_PASSWORD = "demo-password";

type RoleCode = "HR_ADMIN" | "MANAGER" | "EMPLOYEE";

interface IdentityUser {
  employeeId: string;
  roleCode: RoleCode;
}

interface EmployeeRow {
  id: string;
  email: string;
}

async function emailByRole(predicate: (role: RoleCode) => boolean, label: string): Promise<string> {
  const usersRes = await fetch(`${API_URL}/identity/users`, { headers: HEADERS });
  if (!usersRes.ok) throw new Error(`GET /identity/users failed: ${usersRes.status} ${usersRes.statusText}`);
  const users = (await usersRes.json()) as IdentityUser[];
  const match = users.find((u) => predicate(u.roleCode));
  if (!match) throw new Error(`No seeded ${label} user — run \`npm run db:seed\` in ninja-hr-backend`);

  const employeesRes = await fetch(`${API_URL}/people/employees`, { headers: HEADERS });
  if (!employeesRes.ok) {
    throw new Error(`GET /people/employees failed: ${employeesRes.status} ${employeesRes.statusText}`);
  }
  const employees = (await employeesRes.json()) as EmployeeRow[];
  const employee = employees.find((e) => e.id === match.employeeId);
  if (!employee) throw new Error(`Seeded ${label} user's employee record (${match.employeeId}) not found`);
  return employee.email;
}

/** The seeded HR admin — used for the shared setup-project storageState. Set E2E_HR_EMAIL to skip the lookup. */
export async function resolveHrEmail(): Promise<string> {
  if (process.env.E2E_HR_EMAIL) return process.env.E2E_HR_EMAIL;
  return emailByRole((role) => role === "HR_ADMIN", "HR_ADMIN");
}

/**
 * Any non-HR seeded user — used where a spec needs its OWN login rather than
 * the shared HR session (e.g. sign-out, which revokes the signed-in Firebase
 * user's refresh tokens by uid: doing that to the HR admin would invalidate
 * every other spec's shared `hr.json` storageState, since they're all the
 * same underlying Firebase account).
 */
export async function resolveEmployeeEmail(): Promise<string> {
  if (process.env.E2E_EMPLOYEE_EMAIL) return process.env.E2E_EMPLOYEE_EMAIL;
  return emailByRole((role) => role !== "HR_ADMIN", "non-HR_ADMIN");
}

/** Fill and submit the /login form. Leaves the caller to assert the resulting URL. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}
