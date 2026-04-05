import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, incomeRecords, services } from "@/db/schema";
import type { IncomePaymentMethod, IncomeSourceAmountType } from "@/platform/enums";
import { computeNextAmountOnUpdate, parsePaymentAmount } from "./income-amount-rules";
import { mapBookingPaymentMethodToIncome } from "./map-payment-method";
import { resolveAmountFromLoadedBooking } from "./resolve-booking-amount";

function resolvePaymentMethod(
  bookingMethod: string | null | undefined,
  previous: IncomePaymentMethod | undefined
): IncomePaymentMethod {
  const t = bookingMethod?.trim();
  if (t) {
    return mapBookingPaymentMethodToIncome(t);
  }
  return previous ?? "other";
}

/**
 * Keeps provider income in sync with booking lifecycle (same transaction as booking updates).
 * One row per `booking_id`; create on first qualifying event, update thereafter.
 */
export async function syncIncomeRecordFromBooking(db: Database, bookingId: string): Promise<void> {
  const [row] = await db
    .select({
      booking: bookings,
      currency: services.currency,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return;

  const b = row.booking;
  const currency = row.currency ?? "CAD";

  const isCompleted = b.status === "completed";
  const isPaid = b.paymentStatus === "paid";

  const [existing] = await db
    .select()
    .from(incomeRecords)
    .where(eq(incomeRecords.bookingId, bookingId))
    .limit(1);

  if (!isCompleted && !isPaid) {
    if (existing) {
      await db.delete(incomeRecords).where(eq(incomeRecords.id, existing.id));
    }
    return;
  }

  const resolvedForInsert = await resolveAmountFromLoadedBooking(db, b);

  const now = new Date();

  if (!existing) {
    if (!resolvedForInsert) {
      const payOnly = parsePaymentAmount(b.paymentAmount?.toString() ?? null);
      if (!payOnly) return;
      await db.insert(incomeRecords).values({
        providerId: b.providerId,
        bookingId,
        amount: payOnly,
        currency,
        paymentMethod: mapBookingPaymentMethodToIncome(b.paymentMethod),
        isCompleted,
        isPaid,
        recognizedAt: now,
        receivedAt: isPaid ? now : null,
        sourceAmountType: "payment_amount",
        updatedAt: now,
      });
      return;
    }

    await db.insert(incomeRecords).values({
      providerId: b.providerId,
      bookingId,
      amount: resolvedForInsert.amount,
      currency,
      paymentMethod: mapBookingPaymentMethodToIncome(b.paymentMethod),
      isCompleted,
      isPaid,
      recognizedAt: now,
      receivedAt: isPaid ? now : null,
      sourceAmountType: resolvedForInsert.sourceAmountType,
      updatedAt: now,
    });
    return;
  }

  const existingSource = (existing.sourceAmountType as IncomeSourceAmountType | null) ?? null;
  const next = computeNextAmountOnUpdate({
    existingAmount: existing.amount.toString(),
    existingSource,
    bookingPaymentAmount: b.paymentAmount?.toString() ?? null,
    resolvedForInsert,
  });

  const pm = resolvePaymentMethod(b.paymentMethod, existing.paymentMethod);

  const receivedFinal = isPaid ? (existing.receivedAt ?? now) : null;

  await db
    .update(incomeRecords)
    .set({
      amount: next.amount,
      currency,
      sourceAmountType: next.sourceAmountType,
      isCompleted,
      isPaid,
      paymentMethod: pm,
      receivedAt: receivedFinal,
      updatedAt: now,
    })
    .where(eq(incomeRecords.id, existing.id));
}
