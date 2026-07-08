import 'server-only';
import createClient from 'openapi-fetch';
import type { paths } from './generated/openapi';
import { SESSION_COOKIE } from '@/lib/session';

export type Persona = 'admin' | 'employee';

export function apiClient(persona: Persona = 'admin', actorId?: string, bearer?: string) {
  // NINJA_HR_API_URL may include "/api/v1" suffix; the generated OpenAPI paths
  // already contain "/api/v1/...", so we strip that suffix to avoid doubling.
  const rawBase = process.env.NINJA_HR_API_URL ?? '';
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, '');
  return createClient<paths>({
    baseUrl,
    headers: {
      // Signed-in requests forward the Firebase session cookie as a bearer
      // token (backend verifies it); otherwise fall back to the trusted
      // server-to-server internal-key lane (dev/e2e).
      ...(bearer
        ? { authorization: `Bearer ${bearer}` }
        : { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' }),
      'x-actor-persona': persona,
      // Resolved to a full ActorContext (user/employee/role) by the backend.
      ...(actorId ? { 'x-actor-id': actorId } : {}),
    },
    // Always hit the backend fresh from Server Actions; reads may opt into caching per-call.
    cache: 'no-store',
  });
}

/** Session-aware client: bearer when signed in, internal-key lane otherwise (dev). */
export async function authedApi(persona: Persona = 'admin', actorId?: string) {
  const { cookies } = await import('next/headers');
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return apiClient(persona, actorId, session);
}
