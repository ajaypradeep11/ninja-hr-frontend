# TestHR — Agentic HR for the Canadian Market

A Next.js front-end for an agentic HR SaaS targeting Canadian SMBs. Built from
the product spec in [`Impl.md`](./Impl.md) and the two design mockups
(`1.png` admin dashboard, `2.png` initiate preboarding).

> **Branding:** `TestHR` is a placeholder. The product name lives in a single
> place — [`lib/brand.ts`](./lib/brand.ts) — so it can be swapped everywhere at
> once. Naming candidates: _Maple HR, TrueNorth HR, Kinetic HR, Cortex HR,
> Sentry HR, Aegis HR, Hrbor, Onward._

## Architecture

This app is a **pure frontend** — it owns no database. All data lives in the
[`ninja-hr-backend`](../ninja-hr-backend) NestJS service, and every read and
write goes over its HTTP API (`/api/v1`):

- **API client:** `lib/api/client.ts` — a `server-only` wrapper around
  [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/), typed against
  `lib/api/generated/openapi.d.ts` (generated from the backend's Swagger spec
  via `npm run api:generate`). Auth is an internal key header plus
  `x-actor-id` / `x-actor-persona` headers identifying the demo user.
- **Reads:** `lib/queries.ts` (server-only) — one async function per resource,
  called from Server Components. Pages are dynamic (live per request).
- **Writes:** `app/actions/*.ts` — Server Actions that call the backend, then
  `revalidatePath`.
- **Identity:** `lib/actor.ts` — the current demo user is a cookie
  (`hr-actor-id`); the topbar's user switcher swaps it. Users come from the
  backend's `/identity/users`.
- **Binary proxies:** `app/api/*` routes stream résumé / document downloads
  from the backend so the internal key never reaches the browser.
- **Pattern:** client-interactive pages are split into a server `page.tsx`
  (fetches) + a client `*-view.tsx` (renders + calls actions).

The browser never talks to the backend directly — everything goes through the
Next.js server — so the backend needs no CORS configuration.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS 3** with a custom brand/ink/canvas token set (`tailwind.config.ts`)
- **lucide-react** icons, **recharts** for charts
- **openapi-fetch** + **openapi-typescript** for the typed backend client

## Getting started

The backend must be running first (see `../ninja-hr-backend/README.md` —
Postgres via Docker, migrate, seed, `npm run start:dev`). Then:

```bash
npm install
cp .env.example .env   # defaults point at http://localhost:4000/api/v1
npm run dev            # http://localhost:3000
```

Or run the whole stack (Postgres + Firebase Auth emulator + backend +
frontend) with Docker from the repo pair's parent directory:
`docker compose up --build`. That wires a real Firebase Auth emulator (not a
disabled/bypassed auth check) and seeds it to match the demo data —
**sign in at http://localhost:3000/login with any seeded work email
(e.g. `sarah.mitchell@company.ca`) / `demo-password`**. A new hire accepts an
onboarding invite (HR generates the link in Preboard) at `/welcome/<token>`,
setting their own password or continuing with Google.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run Next.js dev server against the backend in `.env` |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` / `format` | ESLint (flat config) / Prettier |
| `npm run test:e2e` | Playwright browser e2e (`e2e/*.spec.ts`) — boots backend + frontend itself; needs the DB up, migrated and seeded |
| `npm run test:e2e:headed` | Same, with a visible Chrome window |
| `npm run test:e2e:slow` | Headed + slow motion (600 ms between actions) — set your own pace with `SLOWMO=<ms>` |
| `npm run test:e2e:ui` | Playwright's interactive UI runner (step through, time-travel) |
| `npm run api:generate` | Regenerate `lib/api/generated/openapi.d.ts` from the running backend's Swagger JSON (`http://localhost:4000/api/docs-json`) |

Environment variables (see `.env.example`): `NINJA_HR_API_URL` (backend base
URL) and `INTERNAL_API_KEY` (must match the backend's key).

When the backend API changes, run `npm run api:generate` with the backend up —
the generated types are committed so builds stay hermetic.

## Layout

Two consoles share one shell (sidebar + topbar + ⌘K AI Co-Pilot drawer). Use
the **View as Admin / View as Employee** switch in the top bar to move between
them; the employee console adapts to the selected user (hiring managers and
interview-panel members get extra recruitment tabs).

### Admin console (`/admin`)

| Route | Module |
| --- | --- |
| `/admin` | Dashboard (mockup 1.png) |
| `/admin/employees` | Employee directory + HRIS profiles |
| `/admin/onboarding` (+`/preboard`, `/[id]`) | Onboarding pipeline, checklist, initiate preboarding (mockup 2.png) |
| `/admin/leave` | Leave queue, team calendar, provincial ESA policy engine |
| `/admin/documents` | Document vault |
| `/admin/performance` | Reviews state machine, PIP portal |
| `/admin/training` | Course catalog + assignments |
| `/admin/offboarding` | Task matrix, blocking-task guard, access kill-switch |
| `/admin/recruitment` (+`/new`, `/[id]`, `/ats`, `/candidates`, `/templates`, `/interview-guide`, `/analytics`, `/careers`) | Requisitions, AI JD builder, ATS kanban, candidate CRM, comms templates, hiring analytics |
| `/admin/reports` | Compliance scorecard, headcount, AI insights |
| `/admin/tracker` | Training/probation/milestone lifecycle tracking |
| `/admin/agents` | AI Agent command center + activity ledger |
| `/admin/letter-lab` | HR letter generation from templates |
| `/admin/calculator` | Termination notice / pay calculator |
| `/admin/settings` | Company, provinces, RBAC, integrations, branding |

### Employee portal (`/employee`)

Dashboard, self-service onboarding wizard, leave, training, my growth
(goals / 1-on-1s / feedback / kudos), my profile + documents, internal job
board, my interviews (panel members), my requisitions (hiring managers), and a
full-page AI assistant.

### Public (unauthenticated)

| Route | Purpose |
| --- | --- |
| `/careers` (+`/[slug]`) | Public job board + application form |
| `/track/[token]` | Candidate self-service status portal |

## The compliance engine

`lib/compliance.ts` (+ `lib/holidays.ts`, `lib/leave-balances.ts`,
`lib/inclusive-language.ts`, `lib/calc.ts`) encodes the simplified,
illustrative Canadian rules from the spec — provincial ESA vacation accrual,
BC paid-sick-day floors, Bill 149 job-posting checks, Law 25 retention, the
90-day probation milestone, and termination notice math. These power live
validation in the Recruitment, Leave, Performance, Offboarding and Calculator
modules. **Not legal advice.**

## AI features

AI-labelled features (JD generation, candidate message drafting, the HR
Co-Pilot) are served by the **backend**, which uses `ANTHROPIC_API_KEY` when
set and falls back to deterministic templates when not. The frontend needs no
AI credentials.

## Project structure

```
app/            route groups: (public)/*, /admin/*, /employee/*, api/* proxies
  actions/      Server Actions (all writes → backend HTTP API)
components/
  ui.tsx        design-system primitives (Card, Button, Badge, Avatar, Ring…)
  layout/       Sidebar, Topbar, AgentDrawer (HR Co-Pilot)
lib/
  api/          openapi-fetch client + generated types
  queries.ts    server-only read layer (one function per resource)
  actor.ts      demo-user identity (cookie-based switcher)
  brand.ts      single source of truth for product name
  nav.ts        sidebar navigation config
  compliance.ts Canadian provincial rule engine
  data.ts       shared types + a few demo constants
  utils.ts      cn(), formatCAD(), formatDate(), …
```

## Deployment

This app deploys to **Firebase App Hosting** — a Next.js-native host with a
GitHub integration (push to the tracked branch → build → roll out):

```bash
firebase init apphosting        # one-time: pick the Firebase project + GitHub repo/branch
firebase deploy --only apphosting
```

Config lives in [`apphosting.yaml`](./apphosting.yaml) (build/run resources +
env var names) — it's committed with placeholder (`YOUR_...`) values only.
Set the real ones in the Firebase console (App Hosting → Settings →
Environment) or via secrets:

```bash
firebase apphosting:secrets:set internal-api-key
firebase apphosting:secrets:set firebase-client-email
firebase apphosting:secrets:set firebase-private-key
```

`NINJA_HR_API_URL` must point at the deployed backend (see
`../ninja-hr-backend/Readme.md`'s Deployment section) — **App Hosting cannot
host the NestJS backend**; it's a frontend-only (Next.js) hosting product.
Cloud Run is the pairing for the backend.
