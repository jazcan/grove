import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, customers, services } from "@/db/schema";
import { generateBookingConfirmationCode } from "@/lib/booking-confirmation-code";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import { emitPlatformEvent } from "@/platform/events/emit";

/** Placeholder customer for manual bookings with no linked client (one row per provider via email unique index). */
export const MANUAL_BOOKING_WALK_IN_EMAIL = "walk-in@noemail.grove";
export const MANUAL_BOOKING_WALK_IN_NAME = "Walk-in";

export type CreateBookingInput = {
  providerId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  bufferAfterMinutes: number;
  /** Ignored when `existingCustomerId` or `walkInNoClient` is set. */
  customerName: string;
  /** Ignored when `existingCustomerId` or `walkInNoClient` is set. */
  customerEmail: string;
  customerPhone?: string;
  customerNotes: string;
  /** Customer-selected method at booking time (e.g. cash | etransfer). */
  paymentMethod?: string | null;
  /** Public flow: tier + add-ons used to compute list total (Stage 6). */
  positioningTierId?: string | null;
  selectedAddOnIds?: string[];
  paymentAmount?: string | null;
  /** Percent of subtotal (service + add-ons); stored with booking snapshot. */
  tipPercent?: string | null;
  /** Use an existing CRM customer instead of upserting by email. */
  existingCustomerId?: string;
  /** Attach to the walk-in placeholder (no real client). */
  walkInNoClient?: boolean;
  /** Set when a provider creates the booking (audit + platform event). */
  createdByProviderUserId?: string;
  /** Initial payment row for manual bookings (default unpaid). */
  initialPaymentStatus?: "paid" | "unpaid";
};

export async function createBookingAtomic(
  db: Database,
  input: CreateBookingInput
): Promise<{ bookingId: string; publicReference: string; confirmationCode: string | null; customerId: string }> {
  return db.transaction(async (tx) => {
    const overlap = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, input.providerId),
          ne(bookings.status, "cancelled"),
          sql`${bookings.startsAt} < ${input.endsAt.toISOString()}::timestamptz + (${input.bufferAfterMinutes} * interval '1 minute')`,
          sql`${bookings.endsAt} + (${bookings.bufferAfterMinutes} * interval '1 minute') > ${input.startsAt.toISOString()}::timestamptz`
        )
      )
      .for("update");

    if (overlap.length) {
      throw new Error("SLOT_TAKEN");
    }

    let cust: { id: string };

    if (input.existingCustomerId) {
      const [row] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(eq(customers.id, input.existingCustomerId), eq(customers.providerId, input.providerId))
        )
        .limit(1);
      if (!row) throw new Error("CUSTOMER_NOT_FOUND");
      cust = row;
    } else if (input.walkInNoClient) {
      const walkEmailNorm = normalizeEmail(MANUAL_BOOKING_WALK_IN_EMAIL);
      const [c] = await tx
        .insert(customers)
        .values({
          providerId: input.providerId,
          fullName: MANUAL_BOOKING_WALK_IN_NAME,
          email: MANUAL_BOOKING_WALK_IN_EMAIL,
          emailNormalized: walkEmailNorm,
          phone: null,
          phoneNormalized: null,
          accountReady: false,
        })
        .onConflictDoUpdate({
          target: [customers.providerId, customers.emailNormalized],
          set: {
            fullName: MANUAL_BOOKING_WALK_IN_NAME,
            accountReady: false,
            updatedAt: new Date(),
          },
        })
        .returning({ id: customers.id });
      if (!c) throw new Error("CUSTOMER_FAILED");
      cust = c;
    } else {
      const emailNorm = normalizeEmail(input.customerEmail);
      const phoneNorm = normalizePhone(input.customerPhone);
      const [c] = await tx
        .insert(customers)
        .values({
          providerId: input.providerId,
          fullName: input.customerName.slice(0, 200),
          email: input.customerEmail.slice(0, 320),
          emailNormalized: emailNorm,
          phone: input.customerPhone?.slice(0, 40) ?? null,
          phoneNormalized: phoneNorm,
          accountReady: true,
        })
        .onConflictDoUpdate({
          target: [customers.providerId, customers.emailNormalized],
          set: {
            fullName: input.customerName.slice(0, 200),
            email: input.customerEmail.slice(0, 320),
            phone: input.customerPhone?.slice(0, 40) ?? null,
            phoneNormalized: phoneNorm,
            accountReady: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: customers.id });

      if (!c) throw new Error("CUSTOMER_FAILED");
      cust = c;
    }

    const [svcRow] = await tx
      .select({ canonicalTemplateId: services.canonicalTemplateId })
      .from(services)
      .where(eq(services.id, input.serviceId))
      .limit(1);

    const pay =
      input.paymentMethod?.trim().slice(0, 64) || null;

    const tierId = input.positioningTierId?.trim() || null;
    const addOnIds = input.selectedAddOnIds?.length ? [...new Set(input.selectedAddOnIds)] : [];
    const payAmt = input.paymentAmount?.trim() || null;
    const tipPct = input.tipPercent?.trim() || "0";

    const initialPay =
      input.initialPaymentStatus === "paid" || input.initialPaymentStatus === "unpaid"
        ? input.initialPaymentStatus
        : undefined;

    let confirmationCode: string | null = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = generateBookingConfirmationCode();
      const clash = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.confirmationCode, candidate))
        .limit(1);
      if (!clash.length) {
        confirmationCode = candidate;
        break;
      }
    }
    if (!confirmationCode) {
      throw new Error("BOOKING_CODE_FAILED");
    }

    const [booking] = await tx
      .insert(bookings)
      .values({
        providerId: input.providerId,
        serviceId: input.serviceId,
        canonicalTemplateId: svcRow?.canonicalTemplateId ?? null,
        customerId: cust.id,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        bufferAfterMinutes: input.bufferAfterMinutes,
        status: "pending",
        customerNotes: input.customerNotes.slice(0, 2000),
        paymentMethod: pay,
        positioningTierId: tierId,
        selectedAddOnIds: addOnIds,
        paymentAmount: payAmt,
        tipPercent: tipPct,
        confirmationCode,
        ...(initialPay ? { paymentStatus: initialPay } : {}),
      })
      .returning({ id: bookings.id, publicReference: bookings.publicReference, confirmationCode: bookings.confirmationCode });

    if (!booking) throw new Error("BOOKING_FAILED");

    const auditUserId = input.createdByProviderUserId ?? null;
    const auditActorType = auditUserId ? "user" : "customer";

    await logAudit({
      actorUserId: auditUserId,
      actorType: auditActorType,
      tenantProviderId: input.providerId,
      entityType: "booking",
      entityId: booking.id,
      action: "created",
      metadata: { serviceId: input.serviceId },
    });

    await emitPlatformEvent(
      {
        name: "booking.created",
        aggregateType: "booking",
        aggregateId: booking.id,
        tenantProviderId: input.providerId,
        actorUserId: auditUserId,
        actorType: auditActorType,
        payload: {
          bookingId: booking.id,
          publicReference: booking.publicReference,
          providerId: input.providerId,
          serviceId: input.serviceId,
          customerId: cust.id,
          startsAt: input.startsAt.toISOString(),
          endsAt: input.endsAt.toISOString(),
          canonicalTemplateId: svcRow?.canonicalTemplateId ?? null,
          positioningTierId: tierId,
          selectedAddOnIds: addOnIds,
          paymentAmount: payAmt,
          tipPercent: tipPct,
        },
      },
      tx
    );

    return {
      bookingId: booking.id,
      publicReference: booking.publicReference,
      confirmationCode: booking.confirmationCode,
      customerId: cust.id,
    };
  });
}
