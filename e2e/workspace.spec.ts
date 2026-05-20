import { test, expect } from "@playwright/test";

test.describe("Workspace flows", () => {
  test("new workspace page requires auth", async ({ page }) => {
    await page.goto("/workspace/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("settings team page requires auth", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page).toHaveURL(/\/login/);
  });
});
