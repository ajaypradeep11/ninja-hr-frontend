import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiClient, authedApi } from "@/lib/api/client";
import { SESSION_COOKIE } from "@/lib/session";

export const ACTOR_COOKIE = "hr-actor-id";

export type RoleCode = "HR_ADMIN" | "MANAGER" | "EMPLOYEE";

export interface ActorUser {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  department: string;
  role: "HR Admin" | "Manager" | "Employee";
  roleCode: RoleCode;
  /**
   * The verified, real signed-in user's id (from `/identity/me`). Equal to
   * `id` unless an HR_ADMIN is impersonating another user via `hr-actor-id`,
   * in which case `id` reflects the impersonation target and `realUserId`
   * stays the real caller.
   */
  realUserId: string | null;
  /** The caller's tenant slug — backs public careers links (/careers/<slug>). */
  companySlug: string | null;
}

/** Shape of a single row from `/identity/users` — no impersonation/tenant concept there. */
type UserAccount = Omit<ActorUser, "realUserId" | "companySlug">;

async function unwrap<T>(
  promise: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    throw new Error(`Identity request failed: ${response.status} ${response.statusText}`);
  }
  return data as T;
}

/** All switchable demo users (per-request cached). */
export const getUsers = cache(async (): Promise<ActorUser[]> => {
  const client = await authedApi("admin");
  const rows = await unwrap<UserAccount[]>(client.GET("/api/v1/identity/users"));
  return rows.map((u) => ({ ...u, realUserId: u.id, companySlug: null }));
});

/**
 * The currently signed-in actor. Resolution order:
 * 1. `hr-session` cookie present → verified via the backend's `/identity/me`
 *    (forwarding the session as a bearer token, plus `x-actor-id` for HR
 *    impersonation).
 * 2. No session, but `FIREBASE_AUTH_DISABLED=1` (dev/e2e escape hatch) →
 *    legacy seeded-HR fallback via the demo user switcher.
 * 3. Otherwise → redirect to `/login`.
 */
export const getActor = cache(async (): Promise<ActorUser> => {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const impersonated = store.get(ACTOR_COOKIE)?.value;

  if (session) {
    const client = apiClient("admin", impersonated, session);
    const { data, error, response } = await client.GET("/api/v1/identity/me");
    if (error !== undefined || !response.ok) {
      if (response.status === 401) redirect("/login");
      if (response.status === 403) redirect("/login?error=unprovisioned");
      throw new Error(`identity/me failed: ${response.status}`);
    }
    return data as unknown as ActorUser; // /me returns the users-route shape + realUserId
  }

  if (process.env.FIREBASE_AUTH_DISABLED === "1") {
    const actorId = impersonated;
    const users = await getUsers();

    if (actorId) {
      const match = users.find((u) => u.id === actorId);
      if (match) return match;
      // Stale cookie (e.g. reseeded DB) — fall through to the default.
    }
    const admin = users.find((u) => u.roleCode === "HR_ADMIN") ?? users[0];
    if (!admin) throw new Error("No users seeded — run `npm run db:seed` in ninja-hr-backend");
    return admin;
  }

  redirect("/login");
});
