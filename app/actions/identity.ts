"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTOR_COOKIE, getUsers } from "@/lib/actor";

/** Switch the signed-in demo user. Validates against the seeded user list. */
export async function setActor(userId: string): Promise<void> {
  const users = await getUsers();
  if (!users.some((u) => u.id === userId)) {
    throw new Error("Unknown user");
  }
  const store = await cookies();
  store.set(ACTOR_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
