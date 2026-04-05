"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, invoiceRecords } from "@/db/schema";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import { resolveBookingAmountForMoney } from "@/domain/money/resolve-booking-amount";
import type { ActionState } from "@/domain/auth/actions";

export async function createInvoiceFromBooking(formData: FormData): Promise<ActionState & { invoiceId?: string }> {
  if (!(await csrfOk(formData, { action: "createInvoiceFromBooking" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const bookingId = formData.get("bookingId")?.toString() ?? "";
  if (!bookingId) {
    return { error: "Missing booking." };
  }

  const db = getDb();
  const resolved = await resolveBookingAmountForMoney(db, bookingId, ctx.providerId);
  if (!resolved) {
    return { error: "Could not resolve price for this booking." };
  }

  const [bk] = await db
    .select({ customerId: bookings.customerId })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.providerId, ctx.providerId)))
    .limit(1);
  if (!bk) {
    return { error: "Booking not found." };
  }

  const [inv] = await db
    .insert(invoiceRecords)
    .values({
      providerId: ctx.providerId,
      bookingId,
      customerId: bk.customerId,
      amount: resolved.amount,
      currency: resolved.currency,
      status: "draft",
      issuedAt: new Date(),
    })
    .returning({ id: invoiceRecords.id });

  if (!inv) {
    return { error: "Could not create invoice." };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/dashboard/money");
  return { success: "Invoice created.", invoiceId: inv.id };
}
