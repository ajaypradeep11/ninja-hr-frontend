import "server-only";

/**
 * The backend API base URL, chosen by the `EMULATOR` dev switch in `.env`:
 *
 *   EMULATOR=true  → LOCAL_BACKEND_URL — the local NestJS backend + Postgres
 *                    running on your machine (http://localhost:4000/api/v1).
 *   EMULATOR=false → LIVE_BACKEND_URL  — the deployed Cloud Run backend.
 *
 * Firebase Auth is always the live project regardless of this flag — only the
 * backend (and therefore the database) target changes.
 *
 * Falls back to the single `NINJA_HR_API_URL` var (how prod / Firebase App
 * Hosting configures it) and finally to localhost, so existing deploys keep
 * working untouched. The returned value keeps its "/api/v1" suffix — callers
 * that need the bare origin strip it themselves.
 */
export function backendApiUrl(): string {
  const useLocal = process.env.EMULATOR === "true";
  const chosen = useLocal ? process.env.LOCAL_BACKEND_URL : process.env.LIVE_BACKEND_URL;
  return chosen ?? process.env.NINJA_HR_API_URL ?? "http://localhost:4000/api/v1";
}
