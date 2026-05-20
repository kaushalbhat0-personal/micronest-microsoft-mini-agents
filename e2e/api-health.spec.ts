import { test, expect } from "@playwright/test";

test.describe("API health", () => {
  test("status API returns JSON", async ({ request }) => {
    const response = await request.get("/api/status");
    expect(response.ok()).toBeFalsy();
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("contacts lookup returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/contacts/lookup");
    expect(response.status()).toBe(401);
  });

  test("notes API returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/notes/some-id");
    expect(response.status()).toBe(401);
  });

  test("timeline API returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/timeline/some-id");
    expect(response.status()).toBe(401);
  });
});
