# Public Landing Page + Help Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public marketing landing page at `/` (localninja.ca dark theme, blue accent) plus a docs-style Help Center at `/help` with step-by-step guides for admins and employees, linked from inside the app.

**Architecture:** New `app/(marketing)/` route group with its own scoped dark theme (does not touch the app's shadcn theme). `app/page.tsx` is DELETED and replaced by `app/(marketing)/page.tsx` so `/` renders inside the marketing layout; a server-side cookie check preserves the old redirect-to-`/admin` for signed-in users. Help content is a typed data file rendered by a small client component (sidebar + search).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 3 (marketing pages use scoped plain CSS, not the app theme), `next/font` (Sora), Playwright.

## Global Constraints

- No new npm dependencies. No backend changes.
- Marketing theme tokens (from localninja.ca CSS): bg `#0a0a0a`, surface `#141414`, text-hi `#f4f3ef`, text-body `#c9cac4`, text-dim `#8f9089`, line `rgba(255,255,255,.08)`; **accent = blue `#4da3ff`** (replaces localninja yellow `#ffd84d`); display font Sora, body Inter; pill buttons; `.kicker` uppercase labels with 26px dash.
- Mascot: inline SVG, LocalNinja mascot with "happy arc eyes" (NinjaBusiness variant), badge fill `#4da3ff`-tinted blue instead of yellow — copy paths from spec appendix (localninja.ca HTML).
- Help guide steps MUST use exact UI labels verified from source (explorer flow reports).
- Guides audience values: `"admin" | "employee" | "everyone"`.

---

### Task 1: Marketing layout, theme CSS, mascot

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/marketing.css`
- Create: `components/marketing/mascot.tsx`

**Interfaces:**
- Produces: `<Mascot className?>` (blue-badge happy-eyes SVG), marketing CSS classes `.mkt`, `.mkt-container`, `.mkt-kicker`, `.mkt-btn`, `.mkt-btn-primary`, `.mkt-btn-ghost`, `.mkt-card`, `.mkt-section`; layout renders sticky header (brand "Ninja**HR**", nav: Overview `/`, Help Center `/help`, Sign in `/login`) + footer (© LocalNinja · localninja.ca · Help · Sign in).

- [ ] Layout: server component, loads Sora via `next/font/google` (`variable: "--font-sora"`), imports `./marketing.css`, wraps children in `<div className="mkt">`, sets `metadata` title "NinjaHR — People operations, the ninja way".
- [ ] CSS scoped under `.mkt` (the app's `globals.css` still applies to `<body>`; `.mkt` sets its own `background`, `color`, `font-family` and styles all marketing elements). Include reveal-free simple styles; mascot blink animation (`@keyframes mkt-blink` scaling eye group Y at 0/96/98/100%), respect `prefers-reduced-motion`.
- [ ] Build passes (`npx next build` or dev-render `/help` placeholder).
- [ ] Commit: `feat: marketing route group with localninja-style theme (blue)`

### Task 2: Landing page at `/`

**Files:**
- Delete: `app/page.tsx`
- Create: `app/(marketing)/page.tsx`

**Interfaces:**
- Consumes: Task 1 layout/CSS/Mascot; `cookies()` from `next/headers`; `SESSION_COOKIE` from `@/lib/session`.
- Produces: `/` landing page.

- [ ] Server component: `const jar = await cookies(); if (process.env.FIREBASE_AUTH_DISABLED === "1" || jar.get(SESSION_COOKIE)?.value) redirect("/admin");` then render landing.
- [ ] Sections per spec: hero (kicker "Silent. Swift. Effective — for HR."; H1 "People operations that move like a ninja."; sub-copy; CTAs Sign in → `/login`, How it works → `/help`; Mascot), "What we do" 01/02/03 points (Hire fast / People ops on autopilot / Built for Canadian compliance), feature grid of 6–7 unit cards (Recruitment, Onboarding, Time off & overtime, Performance & growth, Documents & training, Offboarding, AI toolbox), help teaser band, footer in layout.
- [ ] Copy mentions real capabilities only (ATS + public careers site, scorecards, Letter Lab, termination cost calculator, HR copilot).
- [ ] Verify: anonymous `curl localhost:3000/` renders hero; with session cookie redirects to `/admin`.
- [ ] Commit: `feat: public landing page at / (redirects to /admin when signed in)`

### Task 3: Help content data

**Files:**
- Create: `lib/help-content.ts`

**Interfaces:**
- Produces:
  ```ts
  export type HelpStep = { text: string; detail?: string };
  export type HelpGuide = { slug: string; title: string; audience: "admin" | "employee" | "everyone"; summary: string; steps: HelpStep[]; tips?: string[] };
  export type HelpCategory = { id: string; title: string; guides: HelpGuide[] };
  export const HELP_CATEGORIES: HelpCategory[];
  ```

- [ ] Author all v1 guides (3 getting-started, 11 admin, 6 employee — per spec list) using EXACT nav labels/buttons/fields from the explorer flow reports (saved under `docs/superpowers/plans/2026-07-10-flow-notes/`). Every guide: summary sentence + 3–8 numbered steps; tips for permissions/gotchas (e.g. leave approval needs HR admin; invited hire uses /welcome link).
- [ ] Typecheck passes (`npx tsc --noEmit` via `next build` later; file has no React).
- [ ] Commit: `feat: help center guide content`

### Task 4: Help Center page

**Files:**
- Create: `app/(marketing)/help/page.tsx`
- Create: `components/marketing/help-browser.tsx`

**Interfaces:**
- Consumes: `HELP_CATEGORIES` from `@/lib/help-content`, marketing CSS.
- Produces: `/help` route; `<HelpBrowser categories={HELP_CATEGORIES} />` client component.

- [ ] `help/page.tsx`: server component, page header (kicker "Help Center", H1, intro line, audience legend), renders `<HelpBrowser>`.
- [ ] `HelpBrowser` (client): search `<input>` filters guides by title+summary+step text (case-insensitive); sticky sidebar listing categories→guide anchor links (hidden on mobile, replaced by the search + in-flow category headings); main column renders each guide as `<section id={slug}>` with numbered `<ol>` steps, audience badge, tips box. No matches → "No guides match" empty state.
- [ ] Commit: `feat: docs-style /help help center with search`

### Task 5: In-app help links

**Files:**
- Modify: `components/layout/topbar.tsx:157-159` (dead HelpCircle button → link)
- Modify: `app/login/page.tsx` (or its client form file — add footer link)

**Interfaces:** none new.

- [ ] Topbar: replace the no-op `<button>` wrapping `<HelpCircle>` with `<Link href="/help" target="_blank" rel="noopener" title="Help Center">` keeping identical classes/icon. (Shared by admin + employee consoles — one edit covers both.)
- [ ] Login page: under the form/card add `New to NinjaHR? <Link href="/">See what it does</Link> · <Link href="/help">How it works</Link>` styled per existing login styles.
- [ ] Commit: `feat: link help center from app topbar and login page`

### Task 6: E2E + verification

**Files:**
- Create: `e2e/marketing.spec.ts`
- Modify (if needed): none.

- [ ] Spec (anonymous, like `public-careers.spec.ts`):
  ```ts
  import { test, expect } from "@playwright/test";
  test.describe("Marketing pages", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test("landing page renders for anonymous visitor", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/ninja/i);
      await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    });
    test("help center lists guides and search filters", async ({ page }) => {
      await page.goto("/help");
      await expect(page.getByRole("heading", { name: "How to add an employee" })).toBeVisible();
      await page.getByPlaceholder(/search/i).fill("time off");
      await expect(page.getByRole("heading", { name: "How to add an employee" })).not.toBeVisible();
    });
  });
  // Signed-in redirect: covered implicitly — default storageState project hits "/" in existing specs? If not, add:
  test("signed-in visitor is redirected from / to /admin", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/admin/);
  });
  ```
- [ ] `npm run lint` clean, `npx next build` clean.
- [ ] Run Playwright suite (`npm run test:e2e`) — new spec + existing 14 pass (needs DB up/seeded; skip gracefully if stack can't boot and note it).
- [ ] Commit: `test: e2e coverage for landing + help center`
