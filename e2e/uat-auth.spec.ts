import { test, expect } from "@playwright/test";

test.describe("UAT plan 6 (partial) — login validation", () => {
  test("wrong password shows generic error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nonexistent-uat@example.invalid");
    await page.getByLabel("Password").fill("wrong-password!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText(/invalid|password/i);
  });
});
