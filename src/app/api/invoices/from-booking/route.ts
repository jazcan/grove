import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, invoiceRecords } from "@/db/schema";
import { resolveBookingAmountForMoney } from "@/domain/money/resolve-booking-amount";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const u = await getSessionUser();
  if (!u?.providerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { bookingId?: string } | null;
  const bookingId = body?.bookingId?.trim() ?? "";
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const db = getDb();
  const resolved = await resolveBookingAmountForMoney(db, bookingId, u.providerId);
  if (!resolved) {
    return NextResponse.json({ error: "Could not resolve price for this booking." }, { status: 400 });
  }

  const [bk] = await db
    .select({ customerId: bookings.customerId })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.providerId, u.providerId)))
    .limit(1);
  if (!bk) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const [inv] = await db
    .insert(invoiceRecords)
    .values({
      providerId: u.providerId,
      bookingId,
      customerId: bk.customerId,
      amount: resolved.amount,
      currency: resolved.currency,
      status: "draft",
      issuedAt: new Date(),
    })
    .returning({ id: invoiceRecords.id });

  if (!inv) {
    return NextResponse.json({ error: "Could not create invoice." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoiceId: inv.id });
}

export const dynamic = "force-dynamic";
