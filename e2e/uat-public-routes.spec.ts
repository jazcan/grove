import { test, expect } from "@playwright/test";

test.describe("UAT plan 8 (partial) — public routes", () => {
  test("home has primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  test("auth and marketplace pages load", async ({ page }) => {
    for (const path of ["/login", "/signup", "/forgot-password", "/marketplace"]) {
      const res = await page.goto(path);
      expect(res?.ok(), `${path} should return 2xx`).toBeTruthy();
      await expect(page.locator("#main-content, main")).toBeVisible();
    }
  });
});
