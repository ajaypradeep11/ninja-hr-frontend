# NinjaHR Public Landing Page + Help Center — Design

**Date:** 2026-07-10
**Status:** Approved (user: "proceed")

## Goal

hr.localninja.ca currently opens straight onto a login redirect. Visitors coming from
localninja.ca (the parent company site) get no explanation of what NinjaHR is, and
company users have no documentation on how to use the product. This feature adds:

1. A **public marketing landing page at `/`** explaining what NinjaHR does, themed to
   match localninja.ca (dark, Sora + Inter, ninja mascot) but with a **blue accent**
   (HR/business) instead of yellow.
2. A **public docs-style Help Center at `/help`** with step-by-step guides
   ("How to add an employee" — step 1, 2, 3 …) for both HR admins and employees.
3. **Help links** inside the app (admin + employee topbars, login page).

## Non-goals

- No backend changes. No new dependencies.
- No CMS — help content is a structured TypeScript data file.
- No change to the app's existing shadcn-style light/dark theme; the marketing theme
  is scoped to the new route group only.
- No screenshots/videos in guides (text steps only, v1).

## Architecture

New Next.js route group `app/(marketing)/` with its own layout:

```
app/(marketing)/
  layout.tsx          — marketing shell: header (NinjaHR brand, Home/Help/Sign in),
                        footer (localninja.ca link), scoped dark theme
  marketing.css       — localninja-style theme scoped under .mkt (dark #0a0a0a bg,
                        Sora display font, blue accent, kickers, pill buttons, cards)
  home/page.tsx       — landing page content (rendered at / via app/page.tsx)
  help/page.tsx       — Help Center (sidebar nav + search + guide sections)
components/marketing/ — mascot SVG, shared bits (as needed)
lib/help-content.ts   — typed guide data: categories → guides → steps
```

- `app/page.tsx`: if `hr-session` cookie present (or `FIREBASE_AUTH_DISABLED=1`),
  redirect to `/admin` as today; otherwise render the landing page. Implemented by
  keeping `app/page.tsx` as the landing route (server component reading cookies) —
  the `(marketing)` group hosts `/help`; landing shares its layout components.
- Fonts: Sora added via `next/font` in the marketing layout only; body stays Inter.
- Accent blue: `#4da3ff` (localninja's own `--blue`, reads well on #0a0a0a) with the
  app brand `#0b88d5` for solid button fills where contrast allows.
- Mascot: inline SVG of the LocalNinja mascot, "happy arc eyes" variant (the
  NinjaBusiness/people-person unit from localninja.ca), yellow badge swapped for blue.

## Landing page sections

1. **Hero** — kicker "People operations, the ninja way" style tagline; H1; sub-copy
   describing NinjaHR (agentic HR for Canadian SMBs: hiring → onboarding → growth →
   offboarding); CTAs: **Sign in** (→ /login) and **How it works** (→ /help);
   animated mascot (blink via CSS, as on localninja.ca).
2. **What we do** — 01/02/03 points strip (mirrors localninja About): e.g. Hire fast /
   Run people ops on autopilot / Stay compliant (Canadian HR: termination calculator,
   Law-25-minded records).
3. **Feature grid** — unit-style cards for real modules: Recruitment (ATS + public
   careers + candidate portal), Onboarding, Time off & overtime, Performance & growth
   (reviews, PIPs, goals), Documents & training, Offboarding, AI toolbox (Letter Lab,
   HR copilot, JD generator, termination cost calculator).
4. **Help teaser** — "New here? Step-by-step guides" → /help.
5. **Footer** — © LocalNinja, link to localninja.ca, Help, Sign in.

## Help Center (`/help`)

Docs layout: sticky left sidebar (category → guide links), main column renders all
guides as anchor-linked sections; client-side search box filters guides by
title/keywords. Mobile: sidebar collapses to a top select/accordion.

Content model (`lib/help-content.ts`):

```ts
type HelpGuide = {
  slug: string; title: string; audience: "admin" | "employee" | "everyone";
  summary: string; steps: { text: string; detail?: string }[];
  tips?: string[];
};
type HelpCategory = { id: string; title: string; guides: HelpGuide[] };
```

Categories & guides (v1, ~19):

- **Getting started**: What is NinjaHR · Signing in · Accepting your invite
- **For HR admins**: Add an employee · Onboard a new hire · Approve & manage time off ·
  Post a job and hire · Review candidates & interviews · Run performance reviews ·
  Manage documents & training · Offboard an employee · Generate letters (Letter Lab) ·
  Termination cost calculator · Settings, roles & inviting users
- **For employees**: Complete your onboarding · Request time off · Your documents ·
  Complete training · Interviews as a panel member · Profile, goals & performance

Steps must reflect the **actual UI** (exact nav labels, button names, field names) —
verified against the source of each page before writing.

## In-app links

- Admin topbar + employee topbar: "Help" link → `/help`, `target="_blank"`.
- Login page: small "New to NinjaHR? See how it works" link → `/help` (and the
  landing page links to /login).

## Error handling / edge cases

- Logged-in user hits `/`: redirected to `/admin` (cookie presence check, same rule as
  middleware) — bookmarks keep working.
- `/help` is intentionally public (no employee data in it).
- Guides mention permissions where relevant (e.g. approving leave needs HR/manager).

## Testing

- `npm run lint` + `next build` pass.
- Playwright: one new spec — `/` renders hero + nav for anonymous visitor; `/help`
  renders sidebar and a known guide; search filters. (Existing 14 tests unaffected;
  logged-in storageState project must still pass — `/` redirect path covered.)
