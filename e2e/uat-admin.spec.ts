import { test, expect } from "@playwright/test";

/**
 * UAT plan 7 — requires a user whose email was in ADMIN_EMAILS at sign-up.
 * Set UAT_ADMIN_EMAIL and UAT_ADMIN_PASSWORD in the environment before running.
 */
test.describe("UAT plan 7 — admin", () => {
  test("admin reaches audit and AI pages", async ({ page }, testInfo) => {
    const email = process.env.UAT_ADMIN_EMAIL?.trim();
    const password = process.env.UAT_ADMIN_PASSWORD?.trim();
    if (!email || !password) {
      testInfo.skip(true, "Set UAT_ADMIN_EMAIL and UAT_ADMIN_PASSWORD for admin UAT.");
      return;
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/admin**", { timeout: 30_000 });

    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

    await page.goto("/admin/ai");
    await expect(page.getByRole("heading", { name: "AI gateway" })).toBeVisible();
  });
});
