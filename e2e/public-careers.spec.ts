// Public careers page — unauthenticated, no session or actor cookie involved.
import { test, expect } from "@playwright/test";

test.describe("Public careers", () => {
  // /careers is exempt from the auth middleware — run signed out explicitly,
  // rather than relying on the project's default (signed-in) storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("public careers page renders", async ({ page }) => {
    await page.goto("/careers");
    await expect(page.getByRole("heading", { name: "Join our team" })).toBeVisible();
  });
});
