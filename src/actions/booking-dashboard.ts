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
import { recordAssistantEvent } from "@/lib/assistant/event-service";
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
  if (status === "completed") {
    await recordAssistantEvent(db, {
      providerId: ctx.providerId,
      eventType: "booking.completed",
      relatedEntityType: "booking",
      relatedEntityId: id,
      payload: { bookingId: id },
    });
  } else if (status === "cancelled") {
    await recordAssistantEvent(db, {
      providerId: ctx.providerId,
      eventType: "booking.cancelled",
      relatedEntityType: "booking",
      relatedEntityId: id,
      payload: { bookingId: id },
    });
  }
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  revalidatePath("/dashboard/money");
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

  await recordAssistantEvent(db, {
    providerId: ctx.providerId,
    eventType: "payment.updated",
    relatedEntityType: "booking",
    relatedEntityId: id,
    payload: { bookingId: id, from: before.paymentStatus, to: paymentStatus },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  revalidatePath("/dashboard/money");
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

export async function estimateManualBookingPrices(input: {
  serviceIds: string[];
}): Promise<
  | { ok: true; currency: string; total: number; lines: { name: string; amount: number }[] }
  | { error: string }
> {
  try {
    const ctx = await loadProviderContext();
    const ids = [...new Set(input.serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (!ids.length) return { error: "Pick at least one service." };
    if (ids.length > 5) return { error: "At most five services at once." };
    const db = getDb();
    await ensureDefaultPricingProfile(db, ctx.providerId);
    let total = 0;
    let currency = "CAD";
    const lines: { name: string; amount: number }[] = [];
    for (const id of ids) {
      const priced = await computePublicBookingPrice(db, {
        providerId: ctx.providerId,
        serviceId: id,
        positioningTierId: null,
        selectedAddOnIds: [],
        tipPercent: 0,
      });
      if ("error" in priced) return { error: priced.error };
      currency = priced.currency;
      total += priced.grandTotal;
      const [svc] = await db
        .select({ name: services.name })
        .from(services)
        .where(and(eq(services.id, id), eq(services.providerId, ctx.providerId)))
        .limit(1);
      lines.push({ name: svc?.name ?? "Service", amount: priced.grandTotal });
    }
    total = Math.round(total * 100) / 100;
    return { ok: true, currency, total, lines };
  } catch (e) {
    console.error("[estimateManualBookingPrices]", e);
    return { error: "Could not estimate price." };
  }
}

export async function createManualBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createManualBooking" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();

  const customerMode = (formData.get("customerMode")?.toString() ?? "new") as "existing" | "new" | "walkin";
  const fromMulti = formData.getAll("serviceIds").map((v) => String(v).trim()).filter(Boolean);
  const legacySingle = formData.get("serviceId")?.toString()?.trim() ?? "";
  const serviceIds = fromMulti.length > 0 ? fromMulti : legacySingle ? [legacySingle] : [];
  const dateISO = formData.get("dateISO")?.toString() ?? "";
  const slotStartIso = formData.get("slotStart")?.toString() ?? "";
  const notes = plainTextFromInput(formData.get("notes")?.toString() ?? "", 2000);
  const paymentRaw = formData.get("paymentStatus")?.toString() ?? "unpaid";
  const payMethodRaw = formData.get("paymentMethod")?.toString()?.trim().toLowerCase() ?? "";
  const existingCustomerId = formData.get("existingCustomerId")?.toString() ?? "";
  const customerName = plainTextFromInput(formData.get("customerName")?.toString() ?? "", 200);
  const customerEmail = plainTextFromInput(formData.get("customerEmail")?.toString() ?? "", 320);
  const customerPhone = plainTextFromInput(formData.get("customerPhone")?.toString() ?? "", 40);

  const paymentStatus: "paid" | "unpaid" = paymentRaw === "paid" ? "paid" : "unpaid";

  if (!serviceIds.length) return { error: "Choose at least one service." };
  if (serviceIds.length > 5) return { error: "At most five services in one booking." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return { error: "Invalid date." };
  if (!slotStartIso) return { error: "Choose a time." };

  const db = getDb();
  const [provPay] = await db
    .select({ paymentCash: providers.paymentCash, paymentEtransfer: providers.paymentEtransfer })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);

  let paymentMethod: string | null = null;
  if (paymentStatus === "paid") {
    const cashOk = !!provPay?.paymentCash;
    const etOk = !!provPay?.paymentEtransfer;
    if (!cashOk && !etOk) {
      paymentMethod = null;
    } else if (payMethodRaw === "cash" && cashOk) {
      paymentMethod = "cash";
    } else if (payMethodRaw === "etransfer" && etOk) {
      paymentMethod = "etransfer";
    } else if (cashOk && !etOk) {
      paymentMethod = "cash";
    } else if (!cashOk && etOk) {
      paymentMethod = "etransfer";
    } else {
      return { error: "Choose how this was paid (cash or e-transfer)." };
    }
  }

  const primaryServiceId = serviceIds[0]!;
  const [primarySvc] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, primaryServiceId),
        eq(services.providerId, ctx.providerId),
        eq(services.isActive, true)
      )
    )
    .limit(1);
  if (!primarySvc) return { error: "Primary service not found." };

  for (const sid of serviceIds.slice(1)) {
    const [s] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, sid), eq(services.providerId, ctx.providerId), eq(services.isActive, true)))
      .limit(1);
    if (!s) return { error: "One of the add-on services is missing or inactive." };
  }

  if (customerMode === "existing") {
    if (!existingCustomerId) return { error: "Select a customer." };
  } else if (customerMode === "new") {
    if (!customerName.trim()) return { error: "Name is required." };
    if (!customerEmail.includes("@")) return { error: "A valid email is required." };
  }

  const notesRequiredAny = async (): Promise<string | null> => {
    for (const sid of serviceIds) {
      const [s] = await db
        .select({ notesRequired: services.notesRequired })
        .from(services)
        .where(eq(services.id, sid))
        .limit(1);
      if (s?.notesRequired && !notes.trim()) return "Notes are required for one of the selected services.";
    }
    return null;
  };
  const nErr = await notesRequiredAny();
  if (nErr) return { error: nErr };

  if (primarySvc.phoneRequired) {
    if (customerMode === "new" && !customerPhone.trim()) {
      return { error: "Phone number is required for the first service." };
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
    serviceId: primaryServiceId,
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

  await ensureDefaultPricingProfile(db, ctx.providerId);

  const createdIds: string[] = [];

  try {
    let cursorStart = startsAt;

    for (let i = 0; i < serviceIds.length; i++) {
      const sid = serviceIds[i]!;
      const [svc] = await db
        .select()
        .from(services)
        .where(and(eq(services.id, sid), eq(services.providerId, ctx.providerId), eq(services.isActive, true)))
        .limit(1);
      if (!svc) throw new Error("SERVICE_GONE");

      const endsAt = new Date(cursorStart.getTime() + svc.durationMinutes * 60_000);

      const priced = await computePublicBookingPrice(db, {
        providerId: ctx.providerId,
        serviceId: svc.id,
        positioningTierId: null,
        selectedAddOnIds: [],
        tipPercent: 0,
      });
      if ("error" in priced) return { error: priced.error };

      const shared = {
        providerId: ctx.providerId,
        serviceId: svc.id,
        startsAt: cursorStart,
        endsAt,
        bufferAfterMinutes: svc.bufferMinutes,
        customerNotes: notes,
        paymentMethod,
        positioningTierId: priced.tierId,
        selectedAddOnIds: priced.selectedAddOnIds,
        paymentAmount: priced.grandTotal.toFixed(2),
        tipPercent: priced.tipPercent.toFixed(2),
        createdByProviderUserId: ctx.id,
        initialPaymentStatus: paymentStatus,
      };

      const created = await createBookingAtomic(
        db,
        customerMode === "walkin"
          ? {
              ...shared,
              walkInNoClient: true,
              customerName: "",
              customerEmail: "",
            }
          : customerMode === "existing"
            ? {
                ...shared,
                existingCustomerId,
                customerName: "",
                customerEmail: "",
              }
            : {
                ...shared,
                customerName,
                customerEmail,
                customerPhone: customerPhone || undefined,
              }
      );

      createdIds.push(created.bookingId);
      cursorStart = new Date(endsAt.getTime() + svc.bufferMinutes * 60_000);
    }

    const firstId = createdIds[0];
    if (firstId) {
      await recordAssistantEvent(db, {
        providerId: ctx.providerId,
        eventType: "booking.created",
        relatedEntityType: "booking",
        relatedEntityId: firstId,
        payload: { bookingId: firstId, manual: true, bundleSize: serviceIds.length },
      });
    }

    if (customerMode !== "walkin" && firstId) {
      await enqueueNotification({
        kind: "booking_confirmation",
        bookingId: firstId,
        idempotencyKey: `booking_confirmation:${firstId}`,
      });

      const [prov] = await db
        .select({ reminder24h: providers.reminder24h })
        .from(providers)
        .where(eq(providers.id, ctx.providerId))
        .limit(1);
      const startMsFirst = startsAt.getTime();
      const reminder24 = prov?.reminder24h ? startMsFirst - 24 * 60 * 60 * 1000 - Date.now() : null;
      if (reminder24 !== null && reminder24 > 0) {
        await enqueueNotification({
          kind: "booking_reminder",
          bookingId: firstId,
          idempotencyKey: `booking_reminder_24:${firstId}`,
          delayMs: reminder24,
        });
      }

      await enqueueNotification({
        kind: "booking_followup",
        bookingId: firstId,
        idempotencyKey: `booking_followup:${firstId}`,
        delayMs: 60 * 60 * 1000,
      });
    }

    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/money");
    return { success: serviceIds.length > 1 ? `${serviceIds.length} bookings created.` : "Booking created." };
  } catch (e) {
    for (const id of [...createdIds].reverse()) {
      try {
        await updateBookingStatusWithEvent(db, {
          providerId: ctx.providerId,
          bookingId: id,
          status: "cancelled",
          actorUserId: ctx.id,
        });
      } catch (cancelErr) {
        console.error("[createManualBooking] rollback cancel failed", cancelErr);
      }
    }
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time was just taken or the follow-up slot conflicts. Pick another time." };
    }
    if (e instanceof Error && e.message === "CUSTOMER_NOT_FOUND") {
      return { error: "Customer not found." };
    }
    console.error("[createManualBooking]", e);
    return { error: "Could not create the booking. Try again." };
  }
}
