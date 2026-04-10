import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test.describe("UAT plan 8 (partial) — public routes", () => {
  test("home has primary CTAs", async ({ page }) => {
    await page.goto("/");
    const primaryCtas = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryCtas.getByRole("link", { name: "Get started", exact: true })).toBeVisible();
    await expect(primaryCtas.getByRole("link", { name: "Get started", exact: true })).toHaveAttribute(
      "href",
      "/signup"
    );
    await expect(primaryCtas.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
  });

  test("auth pages load", async ({ page }) => {
    for (const path of ["/login", "/signup", "/forgot-password"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      const status = res?.status();
      expect(
        status != null && status < 400,
        `${path} should not error (got HTTP ${status ?? "unknown"})`
      ).toBeTruthy();
      await expect(page.locator("#main-content, main").first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("legacy /marketplace redirects to home", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(page.locator("#main-content, main").first()).toBeVisible({ timeout: 15_000 });
  });

  test("signup prefills referral code from ?ref= query", async ({ page }) => {
    await page.goto("/signup?ref=local12x", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/referral code/i)).toHaveValue("LOCAL12X");
  });
});
