import { test, expect } from "@playwright/test";

/**
 * Automates UAT plans 1–5 in sequence: provider setup, marketplace, public booking,
 * bookings/payment updates, customers, marketing, analytics.
 * Requires Postgres + migrations + seed; starts dev server unless UAT_SKIP_WEBSERVER=1.
 */
test.describe.serial("UAT plans 1–5 — end-to-end journey", () => {
  const password = "uat-long-pass-99";

  test("provider → customer booking → dashboard follow-up", async ({ browser }) => {
    const providerEmail = `uat-${Date.now()}@example.test`;
    const username = `u${Date.now().toString(36)}`;
    const displayLabel = `UAT Prov ${username}`;

    const providerCtx = await browser.newContext({ timezoneId: "America/Toronto" });
    const p = await providerCtx.newPage();

    await p.goto("/signup");
    await p.getByLabel("Email").fill(providerEmail);
    await p.getByLabel("Password").fill(password);
    await p.getByRole("button", { name: "Create account" }).click();
    await p.waitForURL("**/dashboard/onboarding**", { timeout: 45_000 });

    await p.getByLabel("Username").fill(username);
    await p.getByLabel("Display name").fill(displayLabel);
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForURL((url) => new URL(url).pathname === "/dashboard", { timeout: 15_000 });

    await p.goto("/dashboard/profile");
    await p.locator("#displayName").fill(displayLabel);
    await p.locator("#bookingLeadTimeMinutes").fill("0");
    await p.locator('input[name="publicProfileEnabled"]').setChecked(true);
    await p.locator('input[name="discoverable"]').setChecked(true);
    await p.getByRole("button", { name: "Save changes" }).click();
    await p.waitForLoadState("networkidle");

    await p.goto("/dashboard/services");
    const addSection = p.locator("section").filter({ has: p.getByRole("heading", { name: "Add service" }) });
    await addSection.locator('input[name="name"]').fill("UAT Service");
    await addSection.getByRole("button", { name: "Add" }).click();
    await p.waitForLoadState("networkidle");
    await expect(p.locator("ul.mt-12 li").first()).toBeVisible();
    const serviceId = await p.locator("ul.mt-12 li").first().locator('input[name="id"]').inputValue();
    expect(serviceId.length).toBeGreaterThan(0);

    const { dateISO, dow } = await p.evaluate(() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const y = t.getFullYear();
      const m = String(t.getMonth() + 1).padStart(2, "0");
      const d = String(t.getDate()).padStart(2, "0");
      return { dateISO: `${y}-${m}-${d}`, dow: t.getDay() };
    });

    await p.goto("/dashboard/availability");
    await p.locator('select[name="dayOfWeek"]').selectOption(String(dow));
    await p.getByRole("button", { name: "Add hours" }).click();
    await p.waitForLoadState("networkidle");

    await p.goto(`/${username}`);
    await expect(p.getByRole("link", { name: "Book" }).first()).toBeVisible();

    const customerCtx = await browser.newContext({ timezoneId: "America/Toronto" });
    const c = await customerCtx.newPage();

    await c.goto(`/marketplace?q=${encodeURIComponent(displayLabel)}`);
    await expect(c.getByRole("heading", { name: "Find a provider" })).toBeVisible();
    await c.getByRole("link", { name: displayLabel }).click();
    await expect(c).toHaveURL(new RegExp(`/${username}$`));
    await c.getByRole("link", { name: "Book" }).first().click();
    await expect(c).toHaveURL(new RegExp(`/book/${serviceId}`));
    await c.locator("#book-date").fill(dateISO);
    await expect(c.getByText("Loading slots…")).toBeHidden({ timeout: 20_000 });
    await c.getByRole("radio").first().click();
    await c.getByLabel("Your name").fill("UAT Customer");
    await c.locator("#customerEmail").fill("uat.customer@example.test");
    await c.getByRole("button", { name: "Confirm booking" }).click();
    await expect(c.getByRole("status")).toContainText(/Booked/i, { timeout: 20_000 });

    await c.close();
    await customerCtx.close();

    await p.goto("/dashboard/bookings");
    await expect(p.getByRole("link", { name: /UAT Service/i })).toBeVisible();
    await p.getByRole("link", { name: /UAT Service/i }).first().click();
    await expect(p.getByRole("heading", { name: "Booking" })).toBeVisible();

    await p.locator('select[name="status"]').selectOption("confirmed");
    await p.getByRole("button", { name: "Update" }).click();
    await p.waitForLoadState("networkidle");

    await p.locator('select[name="paymentStatus"]').selectOption("paid");
    await p.getByRole("button", { name: "Save payment" }).click();
    await p.waitForLoadState("networkidle");

    await p.goto("/dashboard/customers");
    await expect(p.getByRole("link", { name: /UAT Customer/i })).toBeVisible();
    await p.getByRole("link", { name: /UAT Customer/i }).first().click();
    await expect(p.getByRole("heading", { name: "UAT Customer" })).toBeVisible();

    await p.goto("/dashboard/marketing");
    await expect(p.getByRole("heading", { name: "Marketing" })).toBeVisible();
    await p.getByRole("button", { name: "Send campaign" }).click();
    await p.waitForLoadState("networkidle");

    await p.goto("/dashboard/analytics");
    await expect(p.getByRole("heading", { name: "Analytics" })).toBeVisible();

    await p.goto("/admin");
    await expect(p).toHaveURL(/\/dashboard$/);

    await providerCtx.close();
  });
});
