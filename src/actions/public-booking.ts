"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  providers,
  services,
  bookings,
  availabilityRules,
  blockedTimes,
  canonicalServiceTemplates,
} from "@/db/schema";
import { generateSlots } from "@/domain/availability/slots";
import { createBookingAtomic } from "@/domain/bookings/create-booking";
import { computePublicBookingPrice } from "@/domain/pricing/compute-public-booking-price";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { rankServicesByIntent } from "@/domain/public/match-services-intent";
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
}): Promise<{ slots: { start: string; end: string }[]; error?: string; bookingsPaused?: boolean }> {
  const uname = input.username.trim().toLowerCase();
  if (isReservedUsername(uname)) return { slots: [], error: "Not found" };

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[fetchPublicSlots] database unavailable", e);
    return { slots: [], error: "Service temporarily unavailable. Try again shortly." };
  }

  try {
    const [prov] = await db
      .select()
      .from(providers)
      .where(eq(providers.username, uname))
      .limit(1);
    if (!prov || !prov.publicProfileEnabled) return { slots: [], error: "Not found" };

    if (prov.bookingsPaused) {
      return { slots: [], bookingsPaused: true };
    }

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
  } catch (e) {
    console.error("[fetchPublicSlots] failed", e);
    return { slots: [], error: "Unable to load times. Try again shortly." };
  }
}

export async function matchPublicServicesByIntent(input: {
  username: string;
  intent: string;
}): Promise<{
  matches: { serviceId: string; name: string; score: number }[];
  error?: string;
}> {
  const uname = input.username.trim().toLowerCase();
  const intent = plainTextFromInput(input.intent ?? "", 2000);
  if (isReservedUsername(uname)) return { matches: [], error: "Not found" };

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[matchPublicServicesByIntent] database unavailable", e);
    return { matches: [], error: "Service temporarily unavailable." };
  }

  try {
    const [prov] = await db
      .select()
      .from(providers)
      .where(eq(providers.username, uname))
      .limit(1);
    if (!prov || !prov.publicProfileEnabled) return { matches: [], error: "Not found" };

    const rows = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        templateLabel: canonicalServiceTemplates.label,
        templateShort: canonicalServiceTemplates.descriptionShort,
      })
      .from(services)
      .leftJoin(canonicalServiceTemplates, eq(services.canonicalTemplateId, canonicalServiceTemplates.id))
      .where(and(eq(services.providerId, prov.id), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name));

    const inputs = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      category: r.category ?? "",
      templateLabel: r.templateLabel ?? "",
      templateShort: r.templateShort ?? "",
    }));

    const ranked = rankServicesByIntent(intent, inputs);
    const withPositive = ranked.filter((r) => r.score > 0);
    const source = withPositive.length ? withPositive : ranked;

    return {
      matches: source.slice(0, 8).map((r) => ({
        serviceId: r.service.id,
        name: r.service.name,
        score: r.score,
      })),
    };
  } catch (e) {
    console.error("[matchPublicServicesByIntent] failed", e);
    return { matches: [], error: "Couldn’t match services right now." };
  }
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
  const positioningTierIdRaw = formData.get("positioningTierId")?.toString()?.trim() ?? "";
  const addOnRaw = formData.getAll("addOnIds").map((v) => String(v).trim()).filter(Boolean);

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
  if (prov.bookingsPaused) {
    return { error: "This provider is not accepting new bookings right now. Try again later." };
  }

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
    await ensureDefaultPricingProfile(db, prov.id);

    const priced = await computePublicBookingPrice(db, {
      providerId: prov.id,
      serviceId: svc.id,
      positioningTierId: positioningTierIdRaw || null,
      selectedAddOnIds: addOnRaw,
    });
    if ("error" in priced) {
      return { error: priced.error };
    }

    const paymentAmountStr = priced.grandTotal.toFixed(2);

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
      positioningTierId: priced.tierId,
      selectedAddOnIds: priced.selectedAddOnIds,
      paymentAmount: paymentAmountStr,
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
      success: String(created.publicReference),
    };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time was just taken. Pick another slot." };
    }
    console.error("[submitPublicBooking]", e);
    return { error: "We couldn’t complete the booking. Please try again or contact the provider." };
  }
}
