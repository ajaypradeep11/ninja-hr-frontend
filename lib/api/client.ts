import 'server-only';
import createClient from 'openapi-fetch';
import type { paths } from './generated/openapi';

export type Persona = 'admin' | 'employee';

export function apiClient(persona: Persona = 'admin') {
  return createClient<paths>({
    baseUrl: process.env.NINJA_HR_API_URL,
    headers: {
      'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      'x-actor-persona': persona,
    },
    // Always hit the backend fresh from Server Actions; reads may opt into caching per-call.
    cache: 'no-store',
  });
}
