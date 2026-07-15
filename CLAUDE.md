# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is the frontend half of NinjaHR (agentic HR SaaS for Canadian SMBs) — a
Next.js 15 (App Router) UI. It is pure frontend and owns no database; every
read/write goes through the sibling `ninja-hr-backend/` repo's HTTP API. The
two repos are normally checked out side by side under a shared parent folder
but are otherwise independent (`.git`, `package.json`, lockfiles, CI).

## Commands

```bash
npm install
cp .env.example .env    # defaults point at http://localhost:4000/api/v1; backend must be running first
npm run dev              # http://localhost:3000
npm run build / start    # production build / serve
npm run lint              # eslint . --fix
npm run format              # prettier --write
npm run test:e2e            # Playwright e2e (e2e/*.spec.ts) — boots backend + frontend itself; needs DB up/migrated/seeded
npm run api:generate        # regenerate lib/api/generated/openapi.d.ts from the running backend's Swagger (localhost:4000/api/docs-json)
```

Run a single e2e test:

```bash
npx playwright test e2e/some-file.spec.ts
npx playwright test -g 'test name substring'
npm run test:e2e:headed     # visible browser
npm run test:e2e:slow       # headed + slow motion (SLOWMO=<ms> to tune)
npm run test:e2e:ui         # interactive step-through runner
```

When the backend API surface changes (new/changed endpoint, DTO), run
`npm run api:generate` with the backend up — the generated types are
committed so frontend builds stay hermetic.

### Whole stack (with backend)

`docker compose up --build` from the repo pair's parent directory runs
Postgres + a real Firebase Auth emulator + backend + frontend together, wired
and seeded to match. Sign in at `http://localhost:3000/login` with any
seeded work email / `demo-password`.

## Architecture

### Server-only API layer, no browser-to-backend calls

The browser never talks to the backend directly — everything is proxied
through the Next.js server, so the backend needs no CORS config.

- `lib/api/client.ts` (`server-only`) — `openapi-fetch` client typed against
  the generated `lib/api/generated/openapi.d.ts`. Sends the Firebase session
  cookie as a bearer token when signed in, else falls back to the trusted
  `x-internal-key` lane (dev/e2e), plus `x-actor-persona` / `x-actor-id`.
- `lib/queries.ts` (server-only) — one async read function per resource,
  called from Server Components; pages are dynamic (live per request).
- `app/actions/*.ts` — Server Actions for all writes; call the backend then
  `revalidatePath`.
- `lib/actor.ts` — resolves the current user: session cookie → backend
  `/identity/me`; no session + `FIREBASE_AUTH_DISABLED=1` → legacy demo
  switcher (`hr-actor-id` cookie); otherwise redirect to `/login`.
- `app/api/*` — binary proxy routes that stream résumé/document downloads
  from the backend so the internal key never reaches the browser.
- Pattern for client-interactive pages: server `page.tsx` (fetches) + client
  `*-view.tsx` (renders, calls Server Actions).

Two consoles share one shell (sidebar + topbar + Cmd-K AI Co-Pilot drawer):
`/admin/*` (HR admin — onboarding, leave, recruitment/ATS, performance,
training, offboarding, reports, agents, settings) and `/employee/*`
(self-service — onboarding wizard, leave, growth, my profile, internal job
board; adapts per role, e.g. hiring managers/interview panelists get extra
tabs). Public/unauthenticated routes: `/careers` (job board + apply) and
`/track/[token]` (candidate self-service status).

`lib/compliance.ts` (+ `lib/holidays.ts`, `lib/leave-balances.ts`,
`lib/inclusive-language.ts`, `lib/calc.ts`) encodes simplified, illustrative
Canadian provincial ESA rules (vacation accrual, BC paid-sick-day floors,
Bill 149 job-posting checks, Law 25 retention, 90-day probation, termination
notice math) — **not legal advice** — powering live validation across
Recruitment, Leave, Performance, Offboarding and the Calculator.

### AI features

AI-labelled features (JD generation, candidate message drafting, HR
Co-Pilot) are served by the **backend**. This frontend needs no AI
credentials.

## Deployment

Firebase App Hosting (`apphosting.yaml`), GitHub-integration build-on-push.
`NINJA_HR_API_URL` must point at the deployed backend's Cloud Run URL;
`INTERNAL_API_KEY` must match the backend's.

## Conventions

- Design-system primitives live in `components/ui.tsx`; layout chrome
  (Sidebar, Topbar, AgentDrawer) in `components/layout/`; sidebar nav config
  in `lib/nav.ts`; the single source of truth for the product name is
  `lib/brand.ts`.
- Design/planning docs for past features live under `docs/superpowers/{specs,plans}/`
  — check there for rationale before re-deriving it (e.g. multi-tenancy
  design, Firebase auth design).
