// Public marketing pages — landing at / and the Help Center at /help.
import { test, expect } from "@playwright/test";

test.describe("Marketing pages (anonymous)", () => {
  // Both routes are public — run signed out, like public-careers.spec.ts.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing page renders for anonymous visitors", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "People operations that move like a ninja." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "How it works" })).toBeVisible();
  });

  test("help center lists guides and search filters them", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "How to add an employee" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to onboard a new hire" })).toBeVisible();

    await page.getByPlaceholder("Search guides…").fill("time off");
    await expect(page.getByRole("heading", { name: "How to request time off" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to add an employee" })).not.toBeVisible();
  });
});

test("signed-in visitors are redirected from / to the app", async ({ page }) => {
  // Uses the default (signed-in HR) storageState from the setup project.
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin/);
});
