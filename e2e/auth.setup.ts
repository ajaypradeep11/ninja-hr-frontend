// Playwright "setup" project: signs in as the seeded HR admin once and saves
// the resulting session as storageState, so every other spec runs signed in
// without re-authenticating per test. See playwright.config.ts's `projects`.
import { test as setup, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { login, resolveHrEmail } from "./support/hr-user";

setup("authenticate as HR", async ({ page }) => {
  // The auth emulator + backend are already up by this point — Playwright
  // waits on every webServer's url check before running any test, including
  // this setup project. Re-seeding here (rather than chaining it into the
  // backend webServer command) sidesteps a real ordering hazard: webServer
  // entries start in parallel, so a chained `&& npm run seed:auth` in the
  // backend command has no guarantee the auth emulator is listening yet.
  // Doing it here, after Playwright's own readiness gate, is the robust spot.
  // Idempotent (scripts/seed-auth-emulator.ts treats EMAIL_EXISTS as success).
  execFileSync("npm", ["run", "seed:auth", "--prefix", "../ninja-hr-backend"], { stdio: "inherit" });

  const email = await resolveHrEmail();
  await login(page, email);
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: "e2e/.auth/hr.json" });
});
