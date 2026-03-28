import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  providers,
  services,
  notificationLogs,
  messageTemplates,
} from "@/db/schema";
import { sendEmail, appUrl } from "@/lib/email";
import { escapeHtml } from "@/lib/sanitize";
import { interpolateTemplate } from "@/lib/template-interpolate";

export async function processNotificationJob(input: {
  kind: "booking_confirmation" | "booking_reminder" | "booking_followup";
  bookingId: string;
}): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({
      booking: bookings,
      customer: customers,
      provider: providers,
      service: services,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(providers, eq(bookings.providerId, providers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, input.bookingId))
    .limit(1);

  if (!row) return;

  const idempotencyKey = `${input.kind}:${input.bookingId}`;
  const [existing] = await db
    .select({ id: notificationLogs.id })
    .from(notificationLogs)
    .where(eq(notificationLogs.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing) return;

  const templateType =
    input.kind === "booking_confirmation"
      ? "confirmation"
      : input.kind === "booking_reminder"
        ? "reminder"
        : "followup";

  const tplRows = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.messageType, templateType),
        or(
          isNull(messageTemplates.providerId),
          eq(messageTemplates.providerId, row.provider.id)
        )
      )
    )
    .limit(5);
  const tpl =
    tplRows.find((t) => t.providerId === row.provider.id) ??
    tplRows.find((t) => t.providerId === null) ??
    null;

  const vars: Record<string, string> = {
    providerName: row.provider.displayName,
    serviceName: row.service.name,
    startTime: row.booking.startsAt.toISOString(),
    customerName: row.customer.fullName,
    manageUrl: `${appUrl()}/${row.provider.username}`,
  };

  const subject = tpl
    ? interpolateTemplate(tpl.subject, vars)
    : input.kind === "booking_confirmation"
      ? `Booking confirmed with ${row.provider.displayName}`
      : input.kind === "booking_reminder"
        ? `Reminder: appointment with ${row.provider.displayName}`
        : `Thanks from ${row.provider.displayName}`;

  const html = tpl
    ? interpolateTemplate(tpl.body, vars)
    : `<p>Hi ${escapeHtml(row.customer.fullName)},</p><p>Your booking with ${escapeHtml(
        row.provider.displayName
      )}.</p>`;

  const to = row.customer.email;
  const result = await sendEmail({ to, subject, html });

  try {
    await db.insert(notificationLogs).values({
      providerId: row.provider.id,
      customerId: row.customer.id,
      bookingId: row.booking.id,
      type: input.kind,
      channel: "email",
      status: result.ok ? "sent" : "failed",
      idempotencyKey,
      errorMessage: result.ok ? null : result.error,
    });
  } catch {
    /* duplicate idempotency job */
  }
}
