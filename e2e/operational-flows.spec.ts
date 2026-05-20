import { test, expect } from "@playwright/test";

test.describe("Operational flows (auth-required)", () => {
  test("upload page redirects unauthenticated", async ({ page }) => {
    await page.goto("/upload");
    await expect(page).toHaveURL(/\/login/);
  });

  test("followups page redirects unauthenticated", async ({ page }) => {
    await page.goto("/followups");
    await expect(page).toHaveURL(/\/login/);
  });
});
