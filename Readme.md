# TestHR — Agentic HR for the Canadian Market

A Next.js front-end prototype for an agentic HR SaaS targeting Canadian SMBs.
Built from the product spec in [`Impl.md`](./Impl.md) and the two design mockups
(`1.png` admin dashboard, `2.png` initiate preboarding).

> **Branding:** `TestHR` is a placeholder. The product name lives in a single
> place — [`lib/brand.ts`](./lib/brand.ts) — so it can be swapped everywhere at
> once. Naming candidates: _Maple HR, TrueNorth HR, Kinetic HR, Cortex HR,
> Sentry HR, Aegis HR, Hrbor, Onward._

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS 3** with a custom brand/ink/canvas token set (`tailwind.config.ts`)
- **lucide-react** icons, **recharts** for charts
- **Postgres + Prisma 7** (pg driver adapter) — **all modules** read live from the
  database via Server Components / Server Actions, with Employee as the relational
  hub (leave→employee, candidates→requisition, reviews→employee). `lib/data.ts`
  now only holds the seed source + a few demo constants with no table
  (payroll period, upcoming events, leave balances, compliance score).

## Getting started

Requires Docker Desktop running. Then:

```bash
npm install        # also generates the Prisma client (postinstall)
npm run dev        # http://localhost:3000
```

That's it. `npm run dev` is turnkey — a `predev` hook automatically:
1. starts Postgres in Docker (`db:up`, waits until healthy),
2. applies migrations (`db:migrate`),
3. seeds the database **only if it's empty** (`db:ensure-seed`),

then runs Next.js against the local container (`.env.docker`). Re-running `npm
run dev` won't wipe your data — seeding is skipped once the DB is populated.

Run against **Supabase** instead with `npm run dev:cloud` (reads `.env`; no Docker).

### Docker / database scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Turnkey: bring up Docker Postgres, migrate, seed-if-empty, run Next |
| `npm run dev:cloud` | Run Next against Supabase (`.env`); no Docker |
| `npm run db:up` | Start Postgres in Docker, wait until healthy (idempotent) |
| `npm run db:down` | Stop & remove the container — **keeps** the data volume |
| `npm run db:nuke` | Stop & remove the container **and delete the data volume** |
| `npm run db:fresh` | `db:nuke` → `db:up` → migrate → seed (clean local DB from scratch) |
| `npm run db:migrate` | Apply migrations to the local Docker DB |
| `npm run db:ensure-seed` | Seed the local DB only if it's empty |
| `npm run db:seed:local` | Force-reseed the local DB (wipes + reinserts) |
| `npm run db:studio:local` | Open Prisma Studio against the local Docker DB |
| `npm run db:logs` | Tail Postgres logs |
| `npm run db:psql` | Open a `psql` shell inside the container |

Data persists in the named volume `testhr-pgdata` across `db:down`/restarts; only
`db:nuke` (or `db:fresh`) deletes it. Local connection settings live in
`.env.docker` (no secrets, committed); Supabase credentials live in `.env`
(gitignored). The `db:seed` / `db:reset` / `db:studio` scripts (no `:local`)
target whatever `.env` points at.

## Database

- **Schema:** `prisma/schema.prisma` — Employee (hub), OnboardingCase (+ ChecklistTask,
  CaseDocument, ConsentEntry, AuditEntry), LeaveRequest, Requisition, Candidate,
  PerformanceReview, Pip, TrainingCourse, OffboardingTask, BenefitsCarrier,
  AgentRun, VaultDocument, SalaryBenchmark.
- **Reads:** `lib/queries.ts` (server-only) — one async function per entity,
  returning app-shaped data. Server Components call these; DB-backed pages are
  `force-dynamic` (live per request).
- **Writes:** `app/actions/onboarding.ts` + `app/actions/modules.ts` (Server
  Actions) → `lib/db.ts` (Prisma singleton w/ `@prisma/adapter-pg`). Persisted
  actions: onboarding lifecycle, leave approve/deny, ATS stage moves, PIP issue,
  requisition publish.
- **Enum mapping:** `lib/db-map.ts` bridges DB enums (`IT_OPS`) and the app's
  display strings (`IT / Ops`) in both directions.
- **Pattern:** client-interactive pages are split into a server `page.tsx`
  (fetches) + a client `*-view.tsx` (renders + calls actions).

### Switching to Supabase (production)

1. Create a project at supabase.com — **region `ca-central-1` (Montreal)** for
   Law 25 / PIPEDA data residency.
2. Settings → Database → Connection string → **Prisma**. Put the **pooled** URL
   (port 6543, `?pgbouncer=true`) in `DATABASE_URL` and the **direct** URL
   (port 5432) in `DIRECT_URL` (see `.env.example`).
3. `npx prisma migrate deploy && npm run db:seed`.

That's the only change — application code is identical to local Postgres.

## Layout

Two consoles share one shell (sidebar + topbar + ⌘K AI Co-Pilot drawer). Use the
**View as Admin / View as Employee** switch in the top bar to move between them.

### Admin console (`/admin`)

| Route | Module |
| --- | --- |
| `/admin` | Dashboard (mockup 1.png) |
| `/admin/recruitment` | Requisitions list |
| `/admin/recruitment/new` | AI Job Description builder + Bill 149 / Law 25 validation |
| `/admin/recruitment/ats` | ATS Kanban, AI match breakdown, blind-hiring toggle |
| `/admin/onboarding` | Onboarding pipeline + checklist |
| `/admin/onboarding/preboard` | Initiate Preboarding (mockup 2.png) |
| `/admin/leave` | Leave queue, team calendar, provincial ESA policy engine |
| `/admin/documents` | Document vault, RBAC folder masking, Law 25 retention |
| `/admin/performance` | Reviews state machine, PIP portal with watertight validation |
| `/admin/offboarding` | Task matrix, blocking-task guard, access kill-switch |
| `/admin/reports` | Compliance scorecard, audit export, AI insights |
| `/admin/benefits` | Carrier connections, reconciliation, payroll deduction sync |
| `/admin/tracker` | Training/probation/milestone lifecycle tracking |
| `/admin/agents` | AI Agent command center, activity ledger, intercept guard |
| `/admin/settings` | Company, provinces, RBAC, integrations, branding |

### Employee portal (`/employee`)

Dashboard, self-service onboarding wizard, leave, training, my growth, my
documents, and a full-page AI assistant.

## The compliance engine

`lib/compliance.ts` encodes the (simplified, illustrative) Canadian rules from
the spec — provincial ESA vacation accrual, BC paid-sick-day floors, Bill 149 job
posting checks, Law 25 retention, and the 90-day probation milestone. These power
the live validation in the Recruitment, Leave, Performance and Offboarding
modules. **Not legal advice.**

## Project structure

```
app/            route groups: /admin/*, /employee/*
components/
  ui.tsx        design-system primitives (Card, Button, Badge, Avatar, Ring…)
  layout/       Sidebar, Topbar, AgentDrawer (HR Co-Pilot)
lib/
  brand.ts      single source of truth for product name
  nav.ts        sidebar navigation config
  data.ts       all mock data + types
  compliance.ts Canadian provincial rule engine
  utils.ts      cn(), formatCAD(), formatDate(), …
```
