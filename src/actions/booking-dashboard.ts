"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, services } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import type { InferSelectModel } from "drizzle-orm";

type BookingStatus = InferSelectModel<typeof bookings>["status"];
type PayStatus = InferSelectModel<typeof bookings>["paymentStatus"];

export async function updateBookingStatus(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateBookingStatus" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const status = formData.get("status")?.toString() as BookingStatus;
  const allowed: BookingStatus[] = [
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
    "rescheduled",
  ];
  if (!allowed.includes(status)) return { error: "Invalid status." };
  const db = getDb();
  const res = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(bookings.id, id), eq(bookings.providerId, ctx.providerId)))
    .returning({ id: bookings.id });
  if (!res.length) return { error: "Not found." };
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "booking",
    entityId: id,
    action: "status_changed",
    metadata: { status },
  });
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { success: "Booking updated." };
}

export async function updateBookingNotes(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateBookingNotes" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const internalNotes = plainTextFromInput(formData.get("internalNotes")?.toString() ?? "", 5000);
  const db = getDb();
  const res = await db
    .update(bookings)
    .set({ internalNotes, updatedAt: new Date() })
    .where(and(eq(bookings.id, id), eq(bookings.providerId, ctx.providerId)))
    .returning({ id: bookings.id });
  if (!res.length) return { error: "Not found." };
  return { success: "Notes saved." };
}

export async function updateBookingPayment(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateBookingPayment" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const paymentStatus = formData.get("paymentStatus")?.toString() as PayStatus;
  const allowed: PayStatus[] = ["unpaid", "partially_paid", "paid", "waived", "refunded"];
  if (!allowed.includes(paymentStatus)) return { error: "Invalid payment status." };
  const paymentMethod = plainTextFromInput(formData.get("paymentMethod")?.toString() ?? "", 64);
  const paymentAmountRaw = formData.get("paymentAmount")?.toString();
  const paymentNote = plainTextFromInput(formData.get("paymentNote")?.toString() ?? "", 2000);

  const db = getDb();
  const [before] = await db
    .select({ paymentStatus: bookings.paymentStatus })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.providerId, ctx.providerId)))
    .limit(1);
  if (!before) return { error: "Not found." };

  await db
    .update(bookings)
    .set({
      paymentStatus,
      paymentMethod: paymentMethod || null,
      paymentAmount: paymentAmountRaw?.length ? paymentAmountRaw : null,
      paymentNote: paymentNote || null,
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, id), eq(bookings.providerId, ctx.providerId)));

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "booking",
    entityId: id,
    action: "payment_updated",
    metadata: { from: before.paymentStatus, to: paymentStatus },
  });

  return { success: "Payment updated." };
}

export async function rescheduleBooking(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "rescheduleBooking" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const startsAt = new Date(formData.get("startsAt")?.toString() ?? "");
  const db = getDb();
  const [b] = await db
    .select({
      booking: bookings,
      service: services,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.id, id), eq(bookings.providerId, ctx.providerId)))
    .limit(1);
  if (!b) return { error: "Not found." };
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start time." };

  const durationMs = b.service.durationMinutes * 60_000;
  const endsAt = new Date(startsAt.getTime() + durationMs);
  const buf = b.service.bufferMinutes;

  try {
    await db.transaction(async (tx) => {
      const realOverlap = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.providerId, ctx.providerId),
            ne(bookings.id, id),
            ne(bookings.status, "cancelled"),
            sql`${bookings.startsAt} < ${endsAt} + (${buf} * interval '1 minute')`,
            sql`${bookings.endsAt} + (${bookings.bufferAfterMinutes} * interval '1 minute') > ${startsAt}`
          )
        )
        .for("update");

      if (realOverlap.length) throw new Error("SLOT_TAKEN");

      await tx
        .update(bookings)
        .set({
          startsAt,
          endsAt,
          bufferAfterMinutes: buf,
          status: "rescheduled",
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, id));
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time conflicts with another booking." };
    }
    throw e;
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "booking",
    entityId: id,
    action: "rescheduled",
  });

  return { success: "Booking rescheduled." };
}
