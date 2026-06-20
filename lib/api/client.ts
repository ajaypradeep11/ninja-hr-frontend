import 'server-only';
import createClient from 'openapi-fetch';
import type { paths } from './generated/openapi';

export type Persona = 'admin' | 'employee';

export function apiClient(persona: Persona = 'admin') {
  // NINJA_HR_API_URL may include "/api/v1" suffix; the generated OpenAPI paths
  // already contain "/api/v1/...", so we strip that suffix to avoid doubling.
  const rawBase = process.env.NINJA_HR_API_URL ?? '';
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, '');
  return createClient<paths>({
    baseUrl,
    headers: {
      'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      'x-actor-persona': persona,
    },
    // Always hit the backend fresh from Server Actions; reads may opt into caching per-call.
    cache: 'no-store',
  });
}
