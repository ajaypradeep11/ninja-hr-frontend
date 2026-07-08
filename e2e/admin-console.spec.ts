// Admin console smoke: dashboard renders live data, sidebar navigation works,
// and the leave queue's filter chips respond. Default actor = seeded HR admin.
import { test, expect } from "@playwright/test";

test.describe("Admin console", () => {
  test("dashboard renders for the default HR admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/Good morning/)).toBeVisible();
    // Sidebar shows the core modules.
    for (const label of ["Dashboard", "Employees", "Onboarding", "Leave", "Performance"]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("sidebar navigates to Leave Management", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "Leave", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/leave/);
    await expect(page.getByText("Leave Management").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Absence Records" })).toBeVisible();
  });

  test("leave status filter responds", async ({ page }) => {
    await page.goto("/admin/leave");
    await expect(page.getByRole("heading", { name: "Absence Records" })).toBeVisible();
    // First combobox = status filter, second = leave type.
    const statusFilter = page.getByRole("combobox").first();
    await statusFilter.selectOption("Pending");
    await expect(page.getByText(/of \d+ records/)).toBeVisible();
    await statusFilter.selectOption("All");
  });

  test("employees directory lists seeded people", async ({ page }) => {
    await page.goto("/admin/employees");
    // Seed always creates Sarah Mitchell (HR admin).
    await expect(page.getByText("Sarah Mitchell").first()).toBeVisible();
  });
});
