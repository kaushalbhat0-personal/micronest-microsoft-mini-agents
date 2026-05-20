import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("registration page links from login", async ({ page }) => {
    await page.goto("/login");
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL(/\/register/);
  });
});
