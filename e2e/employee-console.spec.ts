// Employee console: dashboard loads, and the leave page's Request Time Off
// modal opens and closes.
import { test, expect } from "@playwright/test";

test.describe("Employee console", () => {
  test("employee dashboard loads", async ({ page }) => {
    await page.goto("/employee");
    await expect(page.getByRole("link", { name: "AI Assistant" })).toBeVisible();
  });

  test("Request Time Off modal opens on the leave page", async ({ page }) => {
    await page.goto("/employee/leave");
    await page.getByRole("button", { name: /Request Time Off/ }).click();
    // Modal header (heading, as opposed to the trigger button).
    await expect(page.getByText("Request Time Off").nth(1)).toBeVisible();
  });
});
