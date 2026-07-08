# Firebase authentication, end-to-end

**Date:** 2026-07-08
**Status:** Approved (user picked: email/password + Google · invite-only ·
switcher kept as HR impersonation · backend verifies tokens · Firebase App
Hosting frontend / Cloud Run backend)

## Goal

Replace the demo cookie-switcher identity with real authentication. Users sign
in with Firebase (email/password or Google); every backend request carries a
Firebase ID token that the NestJS API verifies itself before resolving the
actor. Deployment targets Firebase App Hosting (frontend) and Cloud Run
(backend). All Firebase credentials are placeholders — the user fills in real
values manually (standing preference: never edit their `.env`).

## Architecture

```
Browser ── Firebase Web SDK ──> Firebase Auth (email/pw, Google)
   │  ID token
   ▼
Next.js (App Hosting)
   │  POST /login session action → firebase-admin mints session cookie (httpOnly)
   │  Server-only API layer: Authorization: Bearer <ID token>
   ▼
NestJS (Cloud Run) ── FirebaseAuthGuard (firebase-admin verifyIdToken)
   │  uid/email → identity user (firebaseUid column) → ActorContext
   ▼
Existing role guards + ~110 routes (unchanged)
```

## Components

### Frontend (`ninja-hr-frontend`)

- **`lib/firebase/client.ts`** — Firebase Web SDK init from
  `NEXT_PUBLIC_FIREBASE_*` env vars (placeholders in `.env.example`).
- **`lib/firebase/admin.ts`** — `firebase-admin` init (server-only) from
  `FIREBASE_*` env vars.
- **`/login` page** — email/password form + "Continue with Google" button,
  themed like the rest of the app (both modes). No signup link.
- **Session:** client posts ID token to a server action after sign-in;
  action verifies and mints a Firebase **session cookie** (httpOnly, 5 days),
  replacing the `hr-actor-id` cookie as the identity source. Sign-out clears
  it and revokes refresh tokens.
- **Middleware** (`middleware.ts`): no session cookie → redirect to `/login`
  for `/admin/*` and `/employee/*`. Public: `/careers/*`, candidate tracking,
  `/login`, static assets.
- **`getActor()` rewrite:** resolves the session cookie → uid/email → identity
  user via backend `GET /identity/me` (new endpoint, token-authenticated).
  HR_ADMIN + impersonation cookie → actor is the impersonated user.
- **API layer:** attaches `Authorization: Bearer <session cookie>` — the
  httpOnly session cookie is itself a Firebase JWT that the backend verifies
  with `verifySessionCookie()`; no client round-trip to refresh ID tokens on
  the server. `x-internal-key` remains only on tokenless server-to-server
  calls (health checks, build-time).
- **User switcher** → **impersonation switcher**: visible only when the real
  signed-in user is HR_ADMIN; sets `hr-actor-id` cookie as today; a "Viewing
  as X — stop" pill appears while impersonating.
- **Invite acceptance:** preboard flow already emails an invite link. At
  invite time the backend creates a Firebase user (Admin SDK) for the work
  email; the link routes to `/welcome/[token]` where the employee sets a
  password (Firebase password-reset flow) or clicks "Continue with Google"
  with the same email.

### Backend (`ninja-hr-backend`)

- **`src/platform/auth/firebase.guard.ts`** — global guard replacing
  `internal-key + actor headers` for user routes: verifies
  `Authorization: Bearer` with `firebase-admin` — `verifyIdToken()` first
  (browser-originated tokens), falling back to `verifySessionCookie()`
  (SSR-originated session JWTs) — then:
  1. look up user by `firebaseUid`;
  2. else match by email (first login), stamp `firebaseUid`;
  3. no match → 403 (authenticated but not provisioned).
  Builds the same `ActorContext` used today. Missing/invalid token → 401.
- **Impersonation:** verified HR_ADMIN + `x-actor-id` header → ActorContext
  becomes the target user; the real uid is kept on the context for audit.
- **Internal-key path stays** for: health endpoint, seed/ops scripts, and the
  Firebase-user-creation call from preboard (server-to-server).
- **Prisma migration:** `users.firebaseUid String? @unique`.
- **`GET /api/v1/identity/me`** — returns the ActorContext for the verified
  token (frontend `getActor()` consumes this).
- **Invite hook:** preboard/onboarding flow calls Admin SDK `createUser`
  (email, disabled password) + generates the invite link.

### Local dev & tests

- **Firebase Auth emulator** via `firebase.json` (placeholder project id
  `demo-ninjahr`); `FIREBASE_AUTH_EMULATOR_HOST` wired in docker-compose and
  `.env.example`s. Seed creates emulator users for the demo personas
  (password `demo-password`, documented in README).
- Backend e2e: helper mints emulator tokens per persona; existing suites swap
  the actor-header helper for it. Frontend Playwright: logs in via emulator
  once (storage state), switcher tests become impersonation tests.

### Deployment (config written, execution manual)

- **Frontend:** `apphosting.yaml` for Firebase App Hosting (Next.js), env
  placeholders documented.
- **Backend:** Dockerfile already exists → Cloud Run; document
  `gcloud run deploy` + Cloud SQL Postgres wiring in the backend README.
  (App Hosting cannot run NestJS; Cloud Run is the supported sibling.)

## Credential placeholders (never real values)

| File | Keys |
|---|---|
| `ninja-hr-frontend/.env.example` | `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`; `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (admin) |
| `ninja-hr-backend/.env.example` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |

All values `YOUR_...` placeholders; README section explains where in the
Firebase console each comes from.

## Error handling

- 401 (no/expired token) → frontend signs out and redirects to `/login`.
- 403 (valid Firebase user, no employee record) → "Your account isn't linked
  to an employee profile — contact HR" screen.
- Emulator absent locally → backend fails fast at boot with a clear message
  when `FIREBASE_AUTH_EMULATOR_HOST`/credentials are both missing.
- Google sign-in with an email that matches no user → same 403 screen;
  the Firebase user is left in place for later linking.

## Out of scope

Candidate portal auth (tracking links stay), MFA, SAML/SSO, password policy
beyond Firebase defaults, actual GCP/Firebase project provisioning and
deploy execution, migrating existing sessions.

## Testing

- Backend unit: guard (valid/expired/none, uid-vs-email lookup, impersonation
  allowed only for HR_ADMIN).
- Backend e2e: all 10 suites green against emulator tokens; new `identity/me`
  spec; 403-unprovisioned spec.
- Frontend e2e: login redirect, successful login, impersonation pill,
  logout, public careers stays tokenless.
