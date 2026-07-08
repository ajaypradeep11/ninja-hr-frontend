# Modern UI refresh: shadcn tokens, dark mode, bento dashboard

**Date:** 2026-07-07
**Status:** Approved (user picked: whole app · tokens + keep kit · full bento look)

## Goal

Modernize the whole NinjaHR frontend (admin console, employee portal, public
careers) to match the "StaffCentral" reference aesthetic — vivid bento-grid
dashboard, big radii, friendly color-block tiles — and add first-class light
and dark modes.

## Architecture

### 1. Theming (shadcn token convention, no component migration)

- `app/globals.css` defines semantic CSS variables for `:root` (light) and
  `.dark`: `--background`, `--foreground`, `--card`, `--card-foreground`,
  `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`,
  `--primary-foreground`, `--ring`.
- `tailwind.config.ts`: `darkMode: "class"`; semantic color names
  (`background`, `card`, `muted`, `border`, …) mapped to the variables.
- **Compat remap** so existing classes flip automatically without editing all
  66 files: `ink` → foreground, `ink-soft`/`ink-muted` → muted-foreground
  shades, `ink-faint` → faint foreground var, `canvas` → muted,
  `line` → border. The `brand` scale stays as-is.
- Theme switching via `next-themes` (only new dependency): class strategy,
  system default, `suppressHydrationWarning` on `<html>`. Sun/moon toggle in
  admin, employee, and public top bars.

### 2. Component kit (`components/ui.tsx`) — restyled, not replaced

- Badge/Dot/ComplianceBadge tones get `dark:` variants (translucent fills,
  lighter text) since pastel `*-50` backgrounds break on dark.
- `Ring` drops hardcoded hexes for CSS variables; new **segmented arc gauge**
  component for the dashboard.
- `Stat` gains an optional vivid variant (solid color-block card, white text)
  echoing the reference tiles.
- Buttons/inputs/cards move to semantic tokens; bigger radii, softer borders.

### 3. Sweep of remaining light-only styling

Mechanical pass over `app/` + `components/`: `bg-white` → `bg-card` (or
semantic equivalent), raw pastel classes (`bg-emerald-50 text-emerald-700`
etc.) get `dark:` variants, inline hexes and light-only gradients fixed,
scrollbar and body colors token-driven.

### 4. Bento dashboard (`app/admin/page.tsx`)

Rebuilt in the reference's language using only data already fetched:

- Row of vivid color-block stat tiles (rose/green/blue/orange): hires
  onboarding, pending leave, training courses, offboarding progress.
- Segmented arc gauge replaces the plain Team Health ring.
- Upcoming Events restyled as agenda list with colored date rail.
- Gradient promo card advertising NinjaHR Copilot → `/admin/agents`.
- Onboarding Pipeline, Leave Requests, Salary Benchmarks, Training keep their
  data with the new card language.

### 5. Everything else

Other modules inherit the theme via the token remap + restyled primitives.
No layout rewrites outside the dashboard.

## Out of scope

- Replacing the dashboard's remaining mock data (greeting user, events,
  offboarding subject) — separate task already tracked in project memory.
- Full shadcn/radix component migration.
- Backend changes.

## Error handling / edge cases

- No-JS / first paint: `next-themes` inline script prevents theme flash;
  `suppressHydrationWarning` avoids hydration mismatch on `<html>`.
- Charts/avatars: `avatarColor` fills and vivid tiles must keep ≥4.5:1 text
  contrast in both modes.

## Testing

- `next build` and `eslint` clean.
- Existing Playwright e2e suite stays green (it asserts content, not colors).
- Manual screenshot pass of the dashboard in light and dark vs the reference.
