// Firebase auth flow: unauthenticated redirect, login round-trip, HR
// impersonation pill, sign-out, and the one page that stays public.
import { test, expect } from "@playwright/test";
import { login, resolveEmployeeEmail, resolveHrEmail } from "./support/hr-user";

test.describe("Signed out", () => {
  // Override the project's default (signed-in) storageState with a blank
  // one — these cases are specifically about the no-session experience.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login succeeds and lands on /admin", async ({ page }) => {
    await login(page, await resolveHrEmail());
    await expect(page).toHaveURL(/\/admin/);
  });

  test("sign-out revokes the session and lands on /login", async ({ page }) => {
    // A dedicated login as a NON-HR seeded user — not the shared HR account
    // every other spec's storageState reuses. Sign-out revokes the signed-in
    // Firebase user's refresh tokens by uid; doing that to the HR admin would
    // invalidate the shared `hr.json` session for the rest of the suite,
    // since it's the same underlying Firebase account.
    await login(page, await resolveEmployeeEmail());
    await expect(page).toHaveURL(/\/employee/);

    // The avatar menu button is the last titled button in the topbar (after
    // the impersonation pill, when present, and the user switcher).
    await page.locator("header button[title]").last().click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // The session cookie is gone — a fresh /employee visit bounces to /login again.
    await page.goto("/employee");
    await expect(page).toHaveURL(/\/login/);
  });

  test("careers page loads with no session", async ({ page }) => {
    await page.goto("/careers");
    await expect(page.getByRole("heading", { name: "Join our team" })).toBeVisible();
  });
});

test.describe("Signed in (HR)", () => {
  test("impersonation pill round-trip", async ({ page }) => {
    await page.goto("/admin");
    await page.getByTitle("Switch user (demo)").click();

    // Pick the first user carrying the plain Employee role badge (same
    // locator as user-switcher.spec.ts).
    await page
      .locator("button", { hasText: /Employee$/ })
      .filter({ hasNotText: "HR Admin" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/employee/, { timeout: 15_000 });

    const stop = page.getByRole("button", { name: /Viewing as .* — Stop/ });
    await expect(stop).toBeVisible();

    await stop.click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("button", { name: /Viewing as .* — Stop/ })).toHaveCount(0);
  });
});
