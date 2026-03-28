"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { rescheduleBookingAtomic } from "@/domain/bookings/reschedule-booking";
import {
  updateBookingInternalNotesWithEvent,
  updateBookingPaymentWithEvent,
  updateBookingStatusWithEvent,
} from "@/domain/bookings/provider-mutations";
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
  const ok = await updateBookingStatusWithEvent(db, {
    providerId: ctx.providerId,
    bookingId: id,
    status,
    actorUserId: ctx.id,
  });
  if (!ok) return { error: "Not found." };
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
  const ok = await updateBookingInternalNotesWithEvent(db, {
    providerId: ctx.providerId,
    bookingId: id,
    internalNotes,
    actorUserId: ctx.id,
  });
  if (!ok) return { error: "Not found." };
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
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

  try {
    await updateBookingPaymentWithEvent(db, {
      providerId: ctx.providerId,
      bookingId: id,
      paymentStatus,
      paymentMethod: paymentMethod || null,
      paymentAmount: paymentAmountRaw?.length ? paymentAmountRaw : null,
      paymentNote: paymentNote || null,
      actorUserId: ctx.id,
      previousPaymentStatus: before.paymentStatus,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return { error: "Not found." };
    throw e;
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "booking",
    entityId: id,
    action: "payment_updated",
    metadata: { from: before.paymentStatus, to: paymentStatus },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { success: "Payment updated." };
}

export async function rescheduleBooking(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "rescheduleBooking" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const startsAt = new Date(formData.get("startsAt")?.toString() ?? "");
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start time." };

  const db = getDb();
  try {
    await rescheduleBookingAtomic(db, {
      providerId: ctx.providerId,
      bookingId: id,
      startsAt,
      actorUserId: ctx.id,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time conflicts with another booking." };
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { error: "Not found." };
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

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { success: "Booking rescheduled." };
}
