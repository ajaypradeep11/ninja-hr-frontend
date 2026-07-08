// Public careers page — unauthenticated, no actor cookie involved.
import { test, expect } from "@playwright/test";

test("public careers page renders", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByRole("heading", { name: "Join our team" })).toBeVisible();
});
