"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { ACTOR_COOKIE } from "@/lib/actor";
import { SESSION_COOKIE } from "@/lib/session";
import { getCaseByToken } from "@/app/actions/onboarding";

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
 * Invite acceptance (`/welcome/:token`): validates the case token over the
 * internal-key lane (the new hire has no session yet — see getCaseByToken),
 * then sets the password on the Firebase identity provisioned at invite time
 * for the case's personalEmail (create-case.command.ts provisions by
 * personalEmail, since preboarding has no work-email field yet). The client
 * then signs in with the returned email + the chosen password and mints a
 * session the same way `/login` does.
 */
export async function activateAccount(caseToken: string, password: string): Promise<ActivateAccountResult> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const onboardingCase = await getCaseByToken(caseToken);
  if (!onboardingCase) {
    throw new Error("This invite link is invalid or has expired — ask HR to re-send it.");
  }
  const email = onboardingCase.personalEmail;
  const auth = adminAuth();
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    uid = (await auth.createUser({ email, emailVerified: false })).uid;
  }
  await auth.updateUser(uid, { password });
  return { email };
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
