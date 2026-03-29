import { test, expect } from "@playwright/test";

test.describe("UAT plan 6 (partial) — login validation", () => {
  test("wrong password shows generic error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nonexistent-uat@example.invalid");
    await page.getByLabel("Password").fill("wrong-password!");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Next.js also renders #__next-route-announcer__ with role="alert"; target the form error only.
    await expect(page.locator(".ui-alert-error")).toContainText(/invalid|password/i);
  });
});
