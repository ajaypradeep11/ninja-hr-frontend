import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";

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
}

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
  return unwrap<ActorUser[]>(apiClient("admin").GET("/api/v1/identity/users"));
});

/**
 * The currently "signed-in" demo user. Resolution order:
 * 1. `hr-actor-id` cookie set by the user switcher
 * 2. fallback: the seeded HR Admin (keeps the app usable pre-switch)
 */
export const getActor = cache(async (): Promise<ActorUser> => {
  const store = await cookies();
  const actorId = store.get(ACTOR_COOKIE)?.value;
  const users = await getUsers();

  if (actorId) {
    const match = users.find((u) => u.id === actorId);
    if (match) return match;
    // Stale cookie (e.g. reseeded DB) — fall through to the default.
  }
  const admin = users.find((u) => u.roleCode === "HR_ADMIN") ?? users[0];
  if (!admin) throw new Error("No users seeded — run `npm run db:seed` in ninja-hr-backend");
  return admin;
});
