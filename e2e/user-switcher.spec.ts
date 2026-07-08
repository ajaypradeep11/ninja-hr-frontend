// The demo user switcher: opening the menu, switching to an employee lands on
// the employee console, and the admin console then redirects non-HR away.
import { test, expect } from "@playwright/test";

test.describe("User switcher", () => {
  test("switching to an Employee lands on the employee console", async ({ page }) => {
    await page.goto("/admin");
    await page.getByTitle("Switch user (demo)").click();
    await expect(page.getByText("Sign in as (demo)")).toBeVisible();

    // Pick the first user carrying the plain Employee role badge.
    await page
      .locator("button", { hasText: /Employee$/ })
      .filter({ hasNotText: "HR Admin" })
      .first()
      .click();

    await expect(page).toHaveURL(/\/employee/, { timeout: 15_000 });

    // Role gating: an employee who tries /admin is bounced back server-side.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/employee/);
  });
});
