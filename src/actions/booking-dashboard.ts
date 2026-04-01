"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, customers, providers, services } from "@/db/schema";
import { loadProviderSlotsForServiceDate } from "@/domain/availability/load-provider-slots";
import { createBookingAtomic } from "@/domain/bookings/create-booking";
import { rescheduleBookingAtomic } from "@/domain/bookings/reschedule-booking";
import { computePublicBookingPrice } from "@/domain/pricing/compute-public-booking-price";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { enqueueNotification } from "@/lib/queue";
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

export async function fetchManualBookingSlots(input: {
  serviceId: string;
  dateISO: string;
}): Promise<{ slots: { start: string; end: string }[]; error?: string }> {
  try {
    const ctx = await loadProviderContext();
    const db = getDb();
    const r = await loadProviderSlotsForServiceDate(db, {
      providerId: ctx.providerId,
      serviceId: input.serviceId.trim(),
      dateISO: input.dateISO.trim(),
    });
    if (!r.ok) return { slots: [], error: "Service not found." };
    return { slots: r.slots };
  } catch (e) {
    console.error("[fetchManualBookingSlots]", e);
    return { slots: [], error: "Could not load times." };
  }
}

export async function createManualBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createManualBooking" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();

  const customerMode = (formData.get("customerMode")?.toString() ?? "new") as "existing" | "new" | "walkin";
  const serviceId = formData.get("serviceId")?.toString() ?? "";
  const dateISO = formData.get("dateISO")?.toString() ?? "";
  const slotStartIso = formData.get("slotStart")?.toString() ?? "";
  const notes = plainTextFromInput(formData.get("notes")?.toString() ?? "", 2000);
  const paymentRaw = formData.get("paymentStatus")?.toString() ?? "unpaid";
  const existingCustomerId = formData.get("existingCustomerId")?.toString() ?? "";
  const customerName = plainTextFromInput(formData.get("customerName")?.toString() ?? "", 200);
  const customerEmail = plainTextFromInput(formData.get("customerEmail")?.toString() ?? "", 320);
  const customerPhone = plainTextFromInput(formData.get("customerPhone")?.toString() ?? "", 40);

  const paymentStatus: "paid" | "unpaid" = paymentRaw === "paid" ? "paid" : "unpaid";

  if (!serviceId) return { error: "Choose a service." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return { error: "Invalid date." };
  if (!slotStartIso) return { error: "Choose a time." };

  const db = getDb();
  const [svc] = await db
    .select()
    .from(services)
    .where(
      and(eq(services.id, serviceId), eq(services.providerId, ctx.providerId), eq(services.isActive, true))
    )
    .limit(1);
  if (!svc) return { error: "Service not found." };

  if (customerMode === "existing") {
    if (!existingCustomerId) return { error: "Select a customer." };
  } else if (customerMode === "new") {
    if (!customerName.trim()) return { error: "Name is required." };
    if (!customerEmail.includes("@")) return { error: "A valid email is required." };
  }

  if (svc.notesRequired && !notes.trim()) {
    return { error: "Notes are required for this service." };
  }
  if (svc.phoneRequired) {
    if (customerMode === "new" && !customerPhone.trim()) {
      return { error: "Phone number is required for this service." };
    }
    if (customerMode === "existing") {
      const [cust] = await db
        .select({ phone: customers.phone })
        .from(customers)
        .where(and(eq(customers.id, existingCustomerId), eq(customers.providerId, ctx.providerId)))
        .limit(1);
      if (!cust) return { error: "Customer not found." };
      if (!cust.phone?.trim()) {
        return { error: "Add a phone number to this customer first, or pick a different customer." };
      }
    }
  }

  const slotLoad = await loadProviderSlotsForServiceDate(db, {
    providerId: ctx.providerId,
    serviceId,
    dateISO,
  });
  if (!slotLoad.ok) return { error: "Could not validate availability." };

  const startsAt = new Date(slotStartIso.trim());
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid time." };
  const startMs = startsAt.getTime();
  const okSlot = slotLoad.slots.some((s) => {
    const t = new Date(s.start).getTime();
    return Number.isFinite(t) && t === startMs;
  });
  if (!okSlot) return { error: "That time is not available." };

  const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60_000);

  await ensureDefaultPricingProfile(db, ctx.providerId);
  const priced = await computePublicBookingPrice(db, {
    providerId: ctx.providerId,
    serviceId: svc.id,
    positioningTierId: null,
    selectedAddOnIds: [],
    tipPercent: 0,
  });
  if ("error" in priced) {
    return { error: priced.error };
  }

  const baseAtomic = {
    providerId: ctx.providerId,
    serviceId: svc.id,
    startsAt,
    endsAt,
    bufferAfterMinutes: svc.bufferMinutes,
    customerNotes: notes,
    paymentMethod: null as string | null,
    positioningTierId: priced.tierId,
    selectedAddOnIds: priced.selectedAddOnIds,
    paymentAmount: priced.grandTotal.toFixed(2),
    tipPercent: priced.tipPercent.toFixed(2),
    createdByProviderUserId: ctx.id,
    initialPaymentStatus: paymentStatus,
  };

  const atomicInput =
    customerMode === "walkin"
      ? {
          ...baseAtomic,
          walkInNoClient: true,
          customerName: "",
          customerEmail: "",
        }
      : customerMode === "existing"
        ? {
            ...baseAtomic,
            existingCustomerId,
            customerName: "",
            customerEmail: "",
          }
        : {
            ...baseAtomic,
            customerName,
            customerEmail,
            customerPhone: customerPhone || undefined,
          };

  try {
    const created = await createBookingAtomic(db, atomicInput);

    if (customerMode !== "walkin") {
      await enqueueNotification({
        kind: "booking_confirmation",
        bookingId: created.bookingId,
        idempotencyKey: `booking_confirmation:${created.bookingId}`,
      });

      const [prov] = await db
        .select({ reminder24h: providers.reminder24h })
        .from(providers)
        .where(eq(providers.id, ctx.providerId))
        .limit(1);
      const startMs = startsAt.getTime();
      const reminder24 = prov?.reminder24h ? startMs - 24 * 60 * 60 * 1000 - Date.now() : null;
      if (reminder24 !== null && reminder24 > 0) {
        await enqueueNotification({
          kind: "booking_reminder",
          bookingId: created.bookingId,
          idempotencyKey: `booking_reminder_24:${created.bookingId}`,
          delayMs: reminder24,
        });
      }

      await enqueueNotification({
        kind: "booking_followup",
        bookingId: created.bookingId,
        idempotencyKey: `booking_followup:${created.bookingId}`,
        delayMs: 60 * 60 * 1000,
      });
    }

    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard");
    return { success: "Booking created." };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time was just taken. Pick another slot." };
    }
    if (e instanceof Error && e.message === "CUSTOMER_NOT_FOUND") {
      return { error: "Customer not found." };
    }
    console.error("[createManualBooking]", e);
    return { error: "Could not create the booking. Try again." };
  }
}
