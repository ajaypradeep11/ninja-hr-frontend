import "server-only";
import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "@/lib/actor";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Auth headers for the BFF binary-proxy routes that stream files straight from
 * the backend (résumés, onboarding documents). Mirrors lib/api/client.ts:
 * forward the verified Firebase session as a bearer so the backend enforces
 * RBAC against the REAL signed-in user (assertCandidateAccess / row-level
 * rules). The trusted internal-key lane — which the backend honors without a
 * credential check and lets `x-actor-id` assert any identity — is used ONLY
 * for local dev/e2e where Firebase auth is turned off.
 *
 * Returns null when there is no session and auth is enabled: the caller must
 * respond 401 rather than fall back to the internal key. Without this these
 * routes were reachable unauthenticated (internal key + persona=admin resolved
 * to HR_ADMIN on the backend), leaking any candidate/onboarding PII.
 */
export async function buildProxyAuthHeaders(): Promise<Record<string, string> | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const actorId = store.get(ACTOR_COOKIE)?.value;
  const authDisabled = process.env.FIREBASE_AUTH_DISABLED === "1";

  const headers: Record<string, string> = {};
  if (session) {
    // Bearer lane: backend verifies the session cookie and resolves the real
    // actor. x-actor-id impersonation is only honored for HR_ADMIN there.
    headers["authorization"] = `Bearer ${session}`;
  } else if (authDisabled) {
    // Dev/e2e only: no Firebase, trusted server-to-server lane.
    headers["x-internal-key"] = process.env.INTERNAL_API_KEY ?? "";
    headers["x-actor-persona"] = "admin";
  } else {
    return null; // unauthenticated request against a Firebase-enabled deployment
  }
  if (actorId) headers["x-actor-id"] = actorId;
  return headers;
}
