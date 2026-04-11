import { test, expect } from "@playwright/test";

test.describe.serial("Onboarding customers step", () => {
  const password = "test-onb-customers-99";

  test("quick add saves at least one customer", async ({ page }) => {
    test.setTimeout(180_000);
    const email = `onb-cust-${Date.now()}@example.test`;
    const username = `oc${Date.now().toString(36)}`;

    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Get set up" }).click();
    await page.waitForURL("**/dashboard/onboarding**", { timeout: 45_000 });

    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Display name").fill(`Onb ${username}`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => new URL(url).pathname === "/dashboard", { timeout: 15_000 });

    await page.goto("/dashboard/onboarding/customers");
    await expect(page.getByRole("heading", { name: /Add people you already serve/i })).toBeVisible();

    await page.getByPlaceholder("e.g. Sam Rivera").fill("Quick Add Test Client");
    await page.getByPlaceholder("name@example.com").fill(`client-${Date.now()}@example.test`);

    await page.getByTestId("onboarding-customers-save-quick").click();
    await expect(page.getByText(/You're set|You.re set/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Saved 1 customer/i)).toBeVisible();
  });

  test("skip continues to share step without adding customers", async ({ page }) => {
    test.setTimeout(180_000);
    const email = `onb-skip-${Date.now()}@example.test`;
    const username = `sk${Date.now().toString(36)}`;

    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Get set up" }).click();
    await page.waitForURL("**/dashboard/onboarding**", { timeout: 45_000 });

    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Display name").fill(`Skip ${username}`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => new URL(url).pathname === "/dashboard", { timeout: 15_000 });

    await page.goto("/dashboard/onboarding/customers");
    await page.getByTestId("onboarding-customers-skip").click();
    await page.waitForURL("**/dashboard/onboarding/share**", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Share your booking link/i })).toBeVisible();
  });
});
