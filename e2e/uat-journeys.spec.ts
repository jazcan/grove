import { test, expect } from "@playwright/test";

/**
 * Automates UAT plans 1–5 in sequence: provider setup, public booking,
 * bookings/payment updates, customers, marketing, analytics.
 * Requires Postgres + migrations + seed; starts dev server unless UAT_SKIP_WEBSERVER=1.
 */
test.describe.serial("UAT plans 1–5 — end-to-end journey", () => {
  const password = "uat-long-pass-99";

  test("provider → customer booking → dashboard follow-up", async ({ browser }) => {
    test.setTimeout(300_000);
    const providerEmail = `uat-${Date.now()}@example.test`;
    const username = `u${Date.now().toString(36)}`;
    const displayLabel = `UAT Prov ${username}`;

    const providerCtx = await browser.newContext({ timezoneId: "America/Toronto" });
    const p = await providerCtx.newPage();

    await p.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(p.getByLabel("Email")).toBeVisible({ timeout: 60_000 });
    await p.getByLabel("Email").fill(providerEmail);
    await p.getByLabel("Password").fill(password);
    await p.getByRole("button", { name: "Create account" }).click();
    await p.waitForURL("**/dashboard/onboarding**", { timeout: 45_000 });

    await p.getByLabel("Display name").fill(displayLabel);
    await expect(p.locator("#onboarding-display-status")).toContainText("Available", { timeout: 30_000 });
    await expect(p.getByLabel("Username")).toBeVisible();
    await p.getByLabel("Username").fill(username);
    await expect(p.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 15_000 });
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForURL("**/dashboard/onboarding/first-service**", { timeout: 15_000 });

    await p.getByRole("textbox", { name: /What are you offering/i }).fill("UAT Service");
    await p.locator('input[name="variant_0_durationMinutes"]').fill("60");
    await p.locator('input[name="variant_0_priceAmount"]').fill("50.00");
    await p.getByRole("button", { name: "Continue to availability" }).click();
    await p.waitForURL((url) => new URL(url).pathname === "/dashboard/availability", { timeout: 15_000 });

    await p.goto("/dashboard/profile");
    await p.locator("#displayName").fill(displayLabel);
    await p.locator("#bookingLeadTimeMinutes").fill("0");
    await p.locator('input[name="publicProfileEnabled"]').setChecked(true);
    await p.locator('input[name="discoverable"]').setChecked(true);
    await p.getByRole("button", { name: "Save changes" }).click();
    await p.waitForLoadState("networkidle");

    await p.goto("/dashboard/services");
    await expect(p.locator("section#existing-services ul li").first()).toBeVisible({ timeout: 60_000 });
    const serviceId = await p
      .locator("section#existing-services ul li")
      .first()
      .locator('input[name="id"]')
      .inputValue();
    expect(serviceId.length).toBeGreaterThan(0);

    const { dateISO } = await p.evaluate(() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const y = t.getFullYear();
      const m = String(t.getMonth() + 1).padStart(2, "0");
      const d = String(t.getDate()).padStart(2, "0");
      return { dateISO: `${y}-${m}-${d}` };
    });

    await p.goto("/dashboard/availability");
    await p.getByRole("button", { name: "Apply Mon–Fri" }).click();
    await p.waitForLoadState("networkidle");
    for (const d of ["6", "0"]) {
      await p.locator('select[name="dayOfWeek"]').selectOption(d);
      await p.getByRole("button", { name: "Add hours" }).click();
      await p.waitForLoadState("networkidle");
    }

    await p.goto(`/${username}`);
    await expect(p.getByRole("link", { name: /Book UAT Service/i }).first()).toBeVisible();

    const customerCtx = await browser.newContext({ timezoneId: "America/Toronto" });
    const c = await customerCtx.newPage();

    await c.goto(`/${username}`);
    await expect(c.getByRole("link", { name: /Book UAT Service/i }).first()).toBeVisible();
    // Full-page navigation is more reliable than depending on client-side routing from the card link.
    await c.goto(`/${username}/book/${serviceId}`);
    await expect(c).toHaveURL(new RegExp(`/book/${serviceId}`));
    await c.locator("#book-date").fill(dateISO);
    await expect(c.getByText("Loading times…")).toBeHidden({ timeout: 30_000 });
    await expect(c.locator('input[name="slotPick"]').first()).toBeVisible({ timeout: 90_000 });
    await c.locator('input[name="slotPick"]').first().click();
    await c.getByLabel(/^First name$/i).fill("UAT");
    await c.getByLabel(/^Last name$/i).fill("Customer");
    await c.locator("#customerEmail").fill("uat.customer@example.test");
    const cashPay = c.locator('input[name="paymentMethod"][value="cash"]');
    if (await cashPay.isVisible()) {
      await cashPay.click();
    } else {
      const etPay = c.locator('input[name="paymentMethod"][value="etransfer"]');
      if (await etPay.isVisible()) await etPay.click();
    }
    await expect(c.getByRole("button", { name: "Confirm booking" })).toBeEnabled({ timeout: 30_000 });
    await c.getByRole("button", { name: "Confirm booking" }).click();
    await expect(c.getByRole("heading", { name: "Booking confirmed" })).toBeVisible({ timeout: 30_000 });

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
