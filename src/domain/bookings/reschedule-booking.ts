import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, services } from "@/db/schema";
import { emitPlatformEvent } from "@/platform/events/emit";

export type RescheduleBookingInput = {
  providerId: string;
  bookingId: string;
  startsAt: Date;
  actorUserId: string;
};

/**
 * Provider reschedule: new start time, same duration, overlap check, status `rescheduled`.
 */
export async function rescheduleBookingAtomic(db: Database, input: RescheduleBookingInput): Promise<void> {
  await db.transaction(async (tx) => {
    const [bk] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.providerId, input.providerId)))
      .limit(1)
      .for("update");

    if (!bk) throw new Error("NOT_FOUND");

    const [svc] = await tx
      .select()
      .from(services)
      .where(eq(services.id, bk.serviceId))
      .limit(1);
    if (!svc) throw new Error("NOT_FOUND");

    const durationMs = svc.durationMinutes * 60_000;
    const endsAt = new Date(input.startsAt.getTime() + durationMs);
    const buf = svc.bufferMinutes;

    const realOverlap = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, input.providerId),
          ne(bookings.id, input.bookingId),
          ne(bookings.status, "cancelled"),
          sql`${bookings.startsAt} < ${endsAt} + (${buf} * interval '1 minute')`,
          sql`${bookings.endsAt} + (${bookings.bufferAfterMinutes} * interval '1 minute') > ${input.startsAt}`
        )
      )
      .for("update");

    if (realOverlap.length) {
      throw new Error("SLOT_TAKEN");
    }

    await tx
      .update(bookings)
      .set({
        startsAt: input.startsAt,
        endsAt,
        bufferAfterMinutes: buf,
        status: "rescheduled",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, input.bookingId));

    await emitPlatformEvent(
      {
        name: "booking.updated",
        aggregateType: "booking",
        aggregateId: input.bookingId,
        tenantProviderId: input.providerId,
        actorUserId: input.actorUserId,
        actorType: "user",
        payload: {
          bookingId: input.bookingId,
          providerId: input.providerId,
          patch: {
            kind: "rescheduled",
            startsAt: input.startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            status: "rescheduled",
          },
        },
      },
      tx
    );
  });
}
