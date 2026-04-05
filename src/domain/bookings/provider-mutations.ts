import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings } from "@/db/schema";
import { syncIncomeRecordFromBooking } from "@/domain/money/sync-income-from-booking";
import { emitPlatformEvent } from "@/platform/events/emit";
import type { InferSelectModel } from "drizzle-orm";

type BookingStatus = InferSelectModel<typeof bookings>["status"];
type PayStatus = InferSelectModel<typeof bookings>["paymentStatus"];

export async function updateBookingStatusWithEvent(
  db: Database,
  input: {
    providerId: string;
    bookingId: string;
    status: BookingStatus;
    actorUserId: string;
  }
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(bookings)
      .set({ status: input.status, updatedAt: new Date() })
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.providerId, input.providerId)))
      .returning({ id: bookings.id });

    if (!row) return false;

    if (input.status === "cancelled") {
      await emitPlatformEvent(
        {
          name: "booking.cancelled",
          aggregateType: "booking",
          aggregateId: input.bookingId,
          tenantProviderId: input.providerId,
          actorUserId: input.actorUserId,
          actorType: "user",
          payload: {
            bookingId: input.bookingId,
            providerId: input.providerId,
            reason: "status_cancelled",
          },
        },
        tx
      );
    } else {
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
            patch: { kind: "status", status: input.status },
          },
        },
        tx
      );
    }

    await syncIncomeRecordFromBooking(tx, input.bookingId);
    return true;
  });
}

export async function updateBookingPaymentWithEvent(
  db: Database,
  input: {
    providerId: string;
    bookingId: string;
    paymentStatus: PayStatus;
    paymentMethod: string | null;
    paymentAmount: string | null;
    paymentNote: string | null;
    actorUserId: string;
    previousPaymentStatus: PayStatus;
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(bookings)
      .set({
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        paymentAmount: input.paymentAmount,
        paymentNote: input.paymentNote,
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.providerId, input.providerId)))
      .returning({ id: bookings.id });

    if (!updated) {
      throw new Error("NOT_FOUND");
    }

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
            kind: "payment",
            paymentStatus: input.paymentStatus,
            previousPaymentStatus: input.previousPaymentStatus,
          },
        },
      },
      tx
    );

    await syncIncomeRecordFromBooking(tx, input.bookingId);
  });
}

export async function updateBookingInternalNotesWithEvent(
  db: Database,
  input: {
    providerId: string;
    bookingId: string;
    internalNotes: string;
    actorUserId: string;
  }
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(bookings)
      .set({ internalNotes: input.internalNotes, updatedAt: new Date() })
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.providerId, input.providerId)))
      .returning({ id: bookings.id });

    if (!row) return false;

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
          patch: { kind: "internal_notes" },
        },
      },
      tx
    );
    return true;
  });
}
