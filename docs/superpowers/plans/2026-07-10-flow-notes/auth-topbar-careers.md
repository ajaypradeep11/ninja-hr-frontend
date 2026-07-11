# Flow notes: auth, topbars, careers (source material for help guides)

## Login (/login)
- Files: `app/login/page.tsx`, `app/login/login-form.tsx`. Centered card with BrandMark.
- Fields: "Work email", "Password". Buttons: "Sign in" (→ "Signing in…"), divider "or", "Continue with Google".
- Footer: "New company? **Create your workspace** (→ /signup). Employees are invited by HR after setup."
- Errors: "Email or password is incorrect." / "Sign-in failed. Try again." / `?error=unprovisioned` banner: "Your account isn't linked to an employee profile yet — contact HR."
- After login always → `/admin`; non-HR users are bounced by admin layout to `/employee`.

## Signup (/signup) — company workspace creation (NOT employee self-signup)
- Heading: "Create your workspace and first HR admin account." One-time setup: company profile + admin's employee record + first HR admin login.
- Fields: "Company name", "Your name", "Work email", "Primary province" (ON/BC/AB/QC/SK/MB/NS/NB, default ON), "Password" (min 8).
- Button: "Create workspace". Footer: "Already onboarded?" → "Sign in".
- Employees never self-register; they join via HR invite link `/welcome/[token]`.

## Invite acceptance (/welcome/[token])
- Public route (outside middleware). Valid token → heading "Welcome to NinjaHR, {firstName}", subtext "Set a password to activate your account and start onboarding."
- Path A: "Password" + "Confirm password" (min 8) → button "Set password & continue".
- Path B: "Continue with Google" (must match invited email, else "Sign in with {email} to accept this invite.").
- Lands at `/employee/onboarding?case={token}`. Invalid token: "This invite link is invalid or has expired." / "Ask HR to re-send your invite."

## Topbar (shared by both consoles)
- `components/layout/topbar.tsx`; rendered by `app/admin/layout.tsx` + `app/employee/layout.tsx`.
- Right cluster: cross-portal switch ("View as Employee" / "View as Admin", HR only), "Live AI Agent" button (opens AgentDrawer, ⌘K), ThemeToggle, Bell, **dead HelpCircle button at lines 157-159 (wire to /help)**, impersonation Stop pill, UserSwitcher (HR only), avatar menu ("Sign out").
- Sidebar (`components/layout/sidebar.tsx` lines 105-108) has a "Support" link (LifeBuoy icon) with href="#" — second candidate for /help.
- Search placeholders: admin "Search employee or document…", employee "Search profiles…".

## Careers (public)
- /careers: heading "Join our team", job cards (title, department · type, province, salary pill) → /careers/[slug].
- Apply form: "Apply for this role" — "Full name", "Email", "Résumé" (PDF/text ≤4MB or paste), pre-screen questions (* = required), privacy-consent checkbox, "Submit Application". Success: "Application received!" + "Track my application" → /track/{portalToken}.
- /track/[token]: "Application status" + timeline + withdraw application.

## Roles & routing
- roleCode: HR_ADMIN | MANAGER | EMPLOYEE (`lib/actor.ts`). Middleware = cookie presence only.
- `/admin` is HR_ADMIN-only (layout redirects others to /employee). `/employee` open to all roles; adaptive nav: recruitment tab (HR or manager w/ live reqs), interviews tab (assigned candidates), onboarding tab while case un-activated (else "My Profile"). Managers see "Manager Portal" label.
- HR impersonation via UserSwitcher; "Viewing as {name} — Stop" pill.
