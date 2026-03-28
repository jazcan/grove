"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, services, bookings, availabilityRules, blockedTimes } from "@/db/schema";
import { generateSlots } from "@/domain/availability/slots";
import { createBookingAtomic } from "@/domain/bookings/create-booking";
import { validateCsrfToken } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { plainTextFromInput } from "@/lib/sanitize";
import { isReservedUsername } from "@/lib/reserved-usernames";
import { enqueueNotification } from "@/lib/queue";
import type { ActionState } from "@/domain/auth/actions";

export async function fetchPublicSlots(input: {
  username: string;
  serviceId: string;
  dateISO: string;
}): Promise<{ slots: { start: string; end: string }[]; error?: string }> {
  const db = getDb();
  const uname = input.username.trim().toLowerCase();
  if (isReservedUsername(uname)) return { slots: [], error: "Not found" };

  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.username, uname))
    .limit(1);
  if (!prov || !prov.publicProfileEnabled) return { slots: [], error: "Not found" };

  const [svc] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, input.serviceId),
        eq(services.providerId, prov.id),
        eq(services.isActive, true)
      )
    )
    .limit(1);
  if (!svc) return { slots: [], error: "Service unavailable" };

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, prov.id));

  const blocks = await db
    .select()
    .from(blockedTimes)
    .where(eq(blockedTimes.providerId, prov.id));

  const existingForDay = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.providerId, prov.id), ne(bookings.status, "cancelled")));

  const slotList = generateSlots({
    dateISO: input.dateISO,
    timezone: prov.timezone,
    rules: rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTimeLocal: r.startTimeLocal,
      endTimeLocal: r.endTimeLocal,
      isActive: r.isActive,
    })),
    blocked: blocks.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    existingBookings: existingForDay.map((b) => ({
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      bufferAfterMinutes: b.bufferAfterMinutes,
    })),
    durationMinutes: svc.durationMinutes,
    bufferMinutes: svc.bufferMinutes,
    slotStepMinutes: 15,
    leadTimeMinutes: prov.bookingLeadTimeMinutes,
    horizonDays: prov.bookingHorizonDays,
    now: new Date(),
  });

  return {
    slots: slotList.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    })),
  };
}

export async function submitPublicBooking(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const csrf = formData.get("csrf")?.toString();
  if (!(await validateCsrfToken(csrf))) return { error: "Invalid security token." };

  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, "book"), 30, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Too many booking attempts. Try again later." };

  const username = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  const serviceId = formData.get("serviceId")?.toString() ?? "";
  const slotStartIso = formData.get("slotStart")?.toString() ?? "";
  const dateISO = formData.get("dateISO")?.toString() ?? "";
  const customerName = plainTextFromInput(formData.get("customerName")?.toString() ?? "", 200);
  const customerEmail = plainTextFromInput(formData.get("customerEmail")?.toString() ?? "", 320);
  const customerPhone = plainTextFromInput(formData.get("customerPhone")?.toString() ?? "", 40);
  const customerNotes = plainTextFromInput(formData.get("customerNotes")?.toString() ?? "", 2000);
  const rawPay = plainTextFromInput(formData.get("paymentMethod")?.toString() ?? "", 64).toLowerCase();

  if (!customerName || !customerEmail.includes("@")) {
    return { error: "Name and valid email are required." };
  }

  const db = getDb();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.username, username))
    .limit(1);
  if (!prov?.publicProfileEnabled) return { error: "Provider not available." };

  const [svc] = await db
    .select()
    .from(services)
    .where(
      and(eq(services.id, serviceId), eq(services.providerId, prov.id), eq(services.isActive, true))
    )
    .limit(1);
  if (!svc) return { error: "Service not available." };

  const startsAt = new Date(slotStartIso);
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid time." };
  const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60_000);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return { error: "Invalid date." };
  }

  const allowed = await fetchPublicSlots({
    username,
    serviceId,
    dateISO,
  });
  const okSlot = allowed.slots.some((s) => s.start === startsAt.toISOString());
  if (!okSlot) return { error: "That time is no longer available." };

  const wantsPayChoice = prov.paymentCash || prov.paymentEtransfer;
  let paymentMethod: string | null = null;
  if (wantsPayChoice) {
    if (rawPay !== "cash" && rawPay !== "etransfer") {
      return { error: "Please select a payment method" };
    }
    if (rawPay === "cash" && !prov.paymentCash) {
      return { error: "That payment method isn’t available for this provider." };
    }
    if (rawPay === "etransfer" && !prov.paymentEtransfer) {
      return { error: "That payment method isn’t available for this provider." };
    }
    paymentMethod = rawPay;
  }

  try {
    const created = await createBookingAtomic(db, {
      providerId: prov.id,
      serviceId: svc.id,
      startsAt,
      endsAt,
      bufferAfterMinutes: svc.bufferMinutes,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      customerNotes,
      paymentMethod,
    });

    await enqueueNotification({
      kind: "booking_confirmation",
      bookingId: created.bookingId,
      idempotencyKey: `booking_confirmation:${created.bookingId}`,
    });

    const startMs = startsAt.getTime();
    const reminder24 = prov.reminder24h
      ? startMs - 24 * 60 * 60 * 1000 - Date.now()
      : null;
    if (reminder24 !== null && reminder24 > 0) {
      await enqueueNotification({
        kind: "booking_reminder",
        bookingId: created.bookingId,
        idempotencyKey: `booking_reminder_24:${created.bookingId}`,
        delayMs: reminder24,
      });
    }

    const followupDelay = 60 * 60 * 1000;
    await enqueueNotification({
      kind: "booking_followup",
      bookingId: created.bookingId,
      idempotencyKey: `booking_followup:${created.bookingId}`,
      delayMs: followupDelay,
    });

    return {
      success: `Booked! Reference: ${created.publicReference}`,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time was just taken. Pick another slot." };
    }
    throw e;
  }
}
