import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, services } from "@/db/schema";
import { computePublicBookingPrice } from "@/domain/pricing/compute-public-booking-price";
import type { IncomeSourceAmountType } from "@/platform/enums";
import { parsePaymentAmount } from "./income-amount-rules";

export async function resolveAmountFromLoadedBooking(
  db: Database,
  b: InferSelectModel<typeof bookings>
): Promise<{ amount: string; sourceAmountType: IncomeSourceAmountType } | null> {
  const fromPay = parsePaymentAmount(b.paymentAmount?.toString() ?? null);
  if (fromPay != null) {
    return { amount: fromPay, sourceAmountType: "payment_amount" };
  }
  const tip = Number(b.tipPercent?.toString() ?? "0");
  const priced = await computePublicBookingPrice(db, {
    providerId: b.providerId,
    serviceId: b.serviceId,
    positioningTierId: b.positioningTierId,
    selectedAddOnIds: b.selectedAddOnIds ?? [],
    tipPercent: Number.isFinite(tip) ? tip : 0,
  });
  if ("error" in priced) {
    return null;
  }
  return { amount: priced.grandTotal.toFixed(2), sourceAmountType: "computed_price" };
}

/**
 * Resolves display/charge amount for a booking (payment snapshot or computed list price).
 */
export async function resolveBookingAmountForMoney(
  db: Database,
  bookingId: string,
  providerId: string
): Promise<{ amount: string; currency: string; sourceAmountType: IncomeSourceAmountType } | null> {
  const [row] = await db
    .select({
      booking: bookings,
      currency: services.currency,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.providerId, providerId)))
    .limit(1);

  if (!row) return null;

  const resolved = await resolveAmountFromLoadedBooking(db, row.booking);
  if (!resolved) return null;

  return {
    ...resolved,
    currency: row.currency ?? "CAD",
  };
}
