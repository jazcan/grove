import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, customers, services } from "@/db/schema";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import { emitPlatformEvent } from "@/platform/events/emit";

export type CreateBookingInput = {
  providerId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  bufferAfterMinutes: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes: string;
  /** Customer-selected method at booking time (e.g. cash | etransfer). */
  paymentMethod?: string | null;
};

export async function createBookingAtomic(
  db: Database,
  input: CreateBookingInput
): Promise<{ bookingId: string; publicReference: string; customerId: string }> {
  const emailNorm = normalizeEmail(input.customerEmail);
  const phoneNorm = normalizePhone(input.customerPhone);

  return db.transaction(async (tx) => {
    const overlap = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, input.providerId),
          ne(bookings.status, "cancelled"),
          sql`${bookings.startsAt} < ${input.endsAt} + (${input.bufferAfterMinutes} * interval '1 minute')`,
          sql`${bookings.endsAt} + (${bookings.bufferAfterMinutes} * interval '1 minute') > ${input.startsAt}`
        )
      )
      .for("update");

    if (overlap.length) {
      throw new Error("SLOT_TAKEN");
    }

    const [cust] = await tx
      .insert(customers)
      .values({
        providerId: input.providerId,
        fullName: input.customerName.slice(0, 200),
        email: input.customerEmail.slice(0, 320),
        emailNormalized: emailNorm,
        phone: input.customerPhone?.slice(0, 40) ?? null,
        phoneNormalized: phoneNorm,
      })
      .onConflictDoUpdate({
        target: [customers.providerId, customers.emailNormalized],
        set: {
          fullName: input.customerName.slice(0, 200),
          phone: input.customerPhone?.slice(0, 40) ?? null,
          phoneNormalized: phoneNorm,
          updatedAt: new Date(),
        },
      })
      .returning({ id: customers.id });

    if (!cust) throw new Error("CUSTOMER_FAILED");

    const [svcRow] = await tx
      .select({ canonicalTemplateId: services.canonicalTemplateId })
      .from(services)
      .where(eq(services.id, input.serviceId))
      .limit(1);

    const pay =
      input.paymentMethod?.trim().slice(0, 64) || null;

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
      })
      .returning({ id: bookings.id, publicReference: bookings.publicReference });

    if (!booking) throw new Error("BOOKING_FAILED");

    await logAudit({
      actorUserId: null,
      actorType: "customer",
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
        actorUserId: null,
        actorType: "customer",
        payload: {
          bookingId: booking.id,
          publicReference: booking.publicReference,
          providerId: input.providerId,
          serviceId: input.serviceId,
          customerId: cust.id,
          startsAt: input.startsAt.toISOString(),
          endsAt: input.endsAt.toISOString(),
          canonicalTemplateId: svcRow?.canonicalTemplateId ?? null,
        },
      },
      tx
    );

    return {
      bookingId: booking.id,
      publicReference: booking.publicReference,
      customerId: cust.id,
    };
  });
}
