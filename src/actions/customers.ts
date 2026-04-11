"use server";

import { and, eq, or, count, gte, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { customers, messageTemplates, marketingSendLogs, bookings } from "@/db/schema";
import { escapeHtml, plainTextFromInput } from "@/lib/sanitize";
import { validateCsrfToken } from "@/lib/csrf";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { isSafeInternalPath } from "@/lib/safe-internal-path";
import { emitOnboardingCustomerAdded } from "@/lib/onboarding-platform-events";

export async function updateCustomerNotes(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateCustomerNotes" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const notes = plainTextFromInput(formData.get("notes")?.toString() ?? "", 5000);
  const db = getDb();
  const res = await db
    .update(customers)
    .set({ notes, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.providerId, ctx.providerId)))
    .returning({ id: customers.id });
  if (!res.length) return { error: "Not found." };
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer",
    entityId: id,
    action: "notes_updated",
  });
  revalidatePath(`/dashboard/customers/${id}`);
  revalidatePath("/dashboard/customers");
  return { success: "Customer notes saved." };
}

export async function setCustomerMarketingOptOut(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "setCustomerMarketingOptOut" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  /** Checkbox "Accepts marketing emails" — checked means opted in (not opted out). */
  const acceptsMarketing = formData.get("acceptsMarketing") === "on";
  const db = getDb();
  const res = await db
    .update(customers)
    .set({ marketingOptOut: !acceptsMarketing, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.providerId, ctx.providerId)))
    .returning({ id: customers.id });
  if (!res.length) return { error: "Not found." };
  revalidatePath(`/dashboard/customers/${id}`);
  revalidatePath("/dashboard/customers");
  return { success: "Preferences saved." };
}

export async function updateCustomerCommunicationNotes(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateCustomerCommunicationNotes" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const communicationNotes = plainTextFromInput(formData.get("communicationNotes")?.toString() ?? "", 2000);
  const db = getDb();
  const res = await db
    .update(customers)
    .set({ communicationNotes, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.providerId, ctx.providerId)))
    .returning({ id: customers.id });
  if (!res.length) return { error: "Not found." };
  revalidatePath(`/dashboard/customers/${id}`);
  revalidatePath("/dashboard/customers");
  return { success: "Communication preferences saved." };
}

/** For `useActionState` from the add-customer modal; redirects on success. */
export async function createCustomerManual(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createCustomerManual" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const fullName = plainTextFromInput(formData.get("fullName")?.toString() ?? "", 200);
  const emailRaw = plainTextFromInput(formData.get("email")?.toString() ?? "", 320);
  const phoneRaw = plainTextFromInput(formData.get("phone")?.toString() ?? "", 40);
  const notes = plainTextFromInput(formData.get("notes")?.toString() ?? "", 5000);

  if (!fullName) return { error: "Name is required." };
  if (!emailRaw.includes("@")) return { error: "A valid email is required." };

  const emailNorm = normalizeEmail(emailRaw);
  const phoneNorm = normalizePhone(phoneRaw || undefined);
  const db = getDb();

  const [custBefore] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.providerId, ctx.providerId));
  const hadCustomers = Number(custBefore?.n ?? 0) > 0;

  const [dup] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.providerId, ctx.providerId), eq(customers.emailNormalized, emailNorm)))
    .limit(1);
  if (dup) return { error: "You already have a customer with this email." };

  const [row] = await db
    .insert(customers)
    .values({
      providerId: ctx.providerId,
      fullName,
      email: emailRaw.slice(0, 320),
      emailNormalized: emailNorm,
      phone: phoneRaw ? phoneRaw.slice(0, 40) : null,
      phoneNormalized: phoneNorm,
      notes,
      accountReady: true,
    })
    .returning({ id: customers.id });

  if (!row) return { error: "Could not add customer." };

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer",
    entityId: row.id,
    action: "created_manual",
  });

  if (!hadCustomers) {
    await emitOnboardingCustomerAdded(db, { providerId: ctx.providerId, userId: ctx.id, actorType: "user" }, row.id);
  }

  const returnTo = formData.get("returnTo")?.toString().trim() ?? "";
  if (returnTo && isSafeInternalPath(returnTo) && returnTo.startsWith("/dashboard/onboarding/")) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}added=1`);
  }

  redirect(`/dashboard/customers/${row.id}?added=1`);
}

export async function sendMarketingToCustomers(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "sendMarketingToCustomers" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, `mkt:${ctx.providerId}`), 50, 24 * 60 * 60 * 1000);
  if (!rl.ok) return { error: "Daily marketing send limit reached." };

  const templateId = formData.get("templateId")?.toString() ?? "";
  const segment = formData.get("segment")?.toString() ?? "recent";
  const db = getDb();

  const [tpl] = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.id, templateId),
        or(eq(messageTemplates.providerId, ctx.providerId), isNull(messageTemplates.providerId))
      )
    )
    .limit(1);
  if (!tpl || tpl.messageType !== "marketing") return { error: "Invalid template." };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let list = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.providerId, ctx.providerId),
        eq(customers.marketingOptOut, false),
        eq(customers.accountReady, true)
      )
    );

  if (segment === "all" || !segment) {
    /* keep full opted-in list */
  } else if (segment === "recent") {
    const rows = await db
      .selectDistinct({ customerId: bookings.customerId })
      .from(bookings)
      .where(
        and(eq(bookings.providerId, ctx.providerId), gte(bookings.createdAt, thirtyDaysAgo))
      );
    const idSet = new Set(rows.map((r) => r.customerId));
    list = list.filter((c) => idSet.has(c.id));
  } else if (segment === "inactive") {
    const rows = await db
      .selectDistinct({ customerId: bookings.customerId })
      .from(bookings)
      .where(
        and(eq(bookings.providerId, ctx.providerId), gte(bookings.createdAt, ninetyDaysAgo))
      );
    const activeSet = new Set(rows.map((r) => r.customerId));
    list = list.filter((c) => !activeSet.has(c.id));
  } else if (segment === "repeat") {
    const rows = await db
      .select({ customerId: bookings.customerId, n: count() })
      .from(bookings)
      .where(eq(bookings.providerId, ctx.providerId))
      .groupBy(bookings.customerId)
      .having(gt(count(), 1));
    const idSet = new Set(rows.map((r) => r.customerId));
    list = list.filter((c) => idSet.has(c.id));
  }

  let sent = 0;
  for (const c of list) {
    const body = tpl.body.replaceAll("{{name}}", c.fullName);
    const subject = tpl.subject.replaceAll("{{name}}", c.fullName);
    const r = await sendEmail({ to: c.email, subject, html: `<p>${body}</p>` });
    if (r.ok) sent += 1;
  }

  await db.insert(marketingSendLogs).values({
    providerId: ctx.providerId,
    templateId: tpl.id,
    customerIds: list.map((c) => c.id),
  });

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "marketing",
    entityId: tpl.id,
    action: "campaign_sent",
    metadata: { segment, count: sent },
  });

  return { success: `Sent messages to ${sent} customers (${segment}).` };
}

function quickMessageToHtml(plain: string): string {
  const esc = escapeHtml(plain).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paras = esc.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
  return paras || "<p></p>";
}

export type QuickMarketingSendResult =
  | { ok: true; sent: number; attempted: number }
  | { ok: false; error: string };

/** Plain-email quick send to opted-in customers (same daily cap as template campaigns). */
export async function sendQuickMarketingMessage(
  csrfToken: string,
  raw: {
    subject: string;
    body: string;
    recipientMode: "all" | "selected";
    customerIds: string[];
  }
): Promise<QuickMarketingSendResult> {
  if (!(await validateCsrfToken(csrfToken))) return { ok: false, error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, `mkt:${ctx.providerId}`), 50, 24 * 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "Daily marketing send limit reached." };

  const subject = plainTextFromInput(raw.subject, 200);
  const body = plainTextFromInput(raw.body, 16000);
  if (!subject) return { ok: false, error: "Subject is required." };
  if (!body) return { ok: false, error: "Message is required." };

  const db = getDb();
  let list = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.providerId, ctx.providerId),
        eq(customers.marketingOptOut, false),
        eq(customers.accountReady, true)
      )
    );

  if (raw.recipientMode === "selected") {
    const set = new Set(raw.customerIds.filter((id) => typeof id === "string" && id.length > 0));
    if (set.size === 0) return { ok: false, error: "Choose at least one customer." };
    list = list.filter((c) => set.has(c.id));
    if (list.length === 0) return { ok: false, error: "No matching opted-in customers in your selection." };
  }

  let sent = 0;
  for (const c of list) {
    const personalizedBody = body.replaceAll("{{name}}", c.fullName);
    const personalizedSubject = subject.replaceAll("{{name}}", c.fullName);
    const r = await sendEmail({
      to: c.email,
      subject: personalizedSubject,
      html: quickMessageToHtml(personalizedBody),
      text: personalizedBody,
    });
    if (r.ok) sent += 1;
  }

  await db.insert(marketingSendLogs).values({
    providerId: ctx.providerId,
    templateId: null,
    customerIds: list.map((c) => c.id),
  });

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "marketing",
    entityId: ctx.providerId,
    action: "quick_message_sent",
    metadata: { mode: raw.recipientMode, sent, attempted: list.length },
  });

  revalidatePath("/dashboard/marketing");
  return { ok: true, sent, attempted: list.length };
}
