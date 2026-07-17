"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { ACTOR_COOKIE } from "@/lib/actor";
import { SESSION_COOKIE } from "@/lib/session";
import { acceptInvite } from "@/app/actions/onboarding";

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

export interface ActivateAccountResult {
  email: string;
}

/**
 * Invite acceptance (`/welcome/:token`). Delegates to the backend, which is the
 * only side that can do this completely: setting a Firebase password is half
 * the job — the hire also needs an Employee/User record bound to that uid, or
 * their first authenticated request 403s in ActorGuard with no identity to
 * resolve. The client then signs in with the returned email + chosen password
 * and mints a session the same way `/login` does.
 */
export async function activateAccount(caseToken: string, password: string): Promise<ActivateAccountResult> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  return acceptInvite(caseToken, { password });
}

/**
 * Google-lane invite acceptance: the hire already signed in with the popup, so
 * the backend verifies that ID token itself (never trust a client-claimed
 * identity) and links the resulting uid to this case's employee record.
 */
export async function activateAccountWithGoogle(caseToken: string, idToken: string): Promise<ActivateAccountResult> {
  return acceptInvite(caseToken, { idToken });
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
