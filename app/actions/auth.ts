"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { ACTOR_COOKIE } from "@/lib/actor";

export const SESSION_COOKIE = "hr-session";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/** Verify a fresh Firebase ID token and mint an httpOnly session cookie. */
export async function createSession(idToken: string): Promise<void> {
  const auth = adminAuth();
  await auth.verifyIdToken(idToken, true); // reject forged/expired before minting
  const session = await auth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
  const store = await cookies();
  store.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIVE_DAYS_MS / 1000,
  });
}

/** Revoke the session's refresh tokens and clear session + impersonation cookies. */
export async function signOutSession(): Promise<void> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (session) {
    const decoded = await adminAuth()
      .verifySessionCookie(session)
      .catch(() => null);
    if (decoded) await adminAuth().revokeRefreshTokens(decoded.uid);
  }
  store.delete(SESSION_COOKIE);
  store.delete(ACTOR_COOKIE);
  redirect("/login");
}
