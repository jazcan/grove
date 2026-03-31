"use server";

import { DateTime } from "luxon";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb, type Database } from "@/db";
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
import { BOOKING_FAILED_SIGNAL_KIND, logProviderSignal } from "@/domain/provider-dashboard-signals";
import { logAudit } from "@/lib/audit";
import { emitPlatformEvent } from "@/platform/events/emit";

type LoadPublicSlotsResult =
  | { ok: true; slots: { start: string; end: string }[] }
  | { ok: false; reason: "not_found" | "paused" | "no_service" };

async function loadPublicSlotsForDate(
  db: Database,
  uname: string,
  serviceId: string,
  dateISO: string
): Promise<LoadPublicSlotsResult> {
  const [prov] = await db.select().from(providers).where(eq(providers.username, uname)).limit(1);
  if (!prov || !prov.publicProfileEnabled) return { ok: false, reason: "not_found" };
  if (prov.bookingsPaused) return { ok: false, reason: "paused" };

  const [svc] = await db
    .select()
    .from(services)
    .where(
      and(eq(services.id, serviceId), eq(services.providerId, prov.id), eq(services.isActive, true))
    )
    .limit(1);
  if (!svc) return { ok: false, reason: "no_service" };

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
    dateISO,
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
    ok: true,
    slots: slotList.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    })),
  };
}

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
    const r = await loadPublicSlotsForDate(db, uname, input.serviceId, input.dateISO);
    if (!r.ok) {
      if (r.reason === "paused") return { slots: [], bookingsPaused: true };
      if (r.reason === "not_found") return { slots: [], error: "Not found" };
      return { slots: [], error: "Service unavailable" };
    }
    return { slots: r.slots };
  } catch (e) {
    console.error("[fetchPublicSlots] failed", e);
    return { slots: [], error: "Unable to load times. Try again shortly." };
  }
}

/** Earliest bookable slot within the provider’s horizon (provider timezone calendar days). */
export async function suggestPublicBookingSlot(input: {
  username: string;
  serviceId: string;
}): Promise<
  | { ok: true; dateISO: string; slotStart: string; slotEnd: string }
  | { ok: false; bookingsPaused?: boolean; error?: string }
> {
  const uname = input.username.trim().toLowerCase();
  if (isReservedUsername(uname)) return { ok: false, error: "Not found" };

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[suggestPublicBookingSlot] database unavailable", e);
    return { ok: false, error: "Service temporarily unavailable. Try again shortly." };
  }

  try {
    const [prov] = await db.select().from(providers).where(eq(providers.username, uname)).limit(1);
    if (!prov || !prov.publicProfileEnabled) return { ok: false, error: "Not found" };
    if (prov.bookingsPaused) return { ok: false, bookingsPaused: true };

    const [svc] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.id, input.serviceId),
          eq(services.providerId, prov.id),
          eq(services.isActive, true)
        )
      )
      .limit(1);
    if (!svc) return { ok: false, error: "Service unavailable" };

    const horizon = Math.max(1, Math.min(Number(prov.bookingHorizonDays) || 60, 120));
    const tz = prov.timezone || "UTC";
    let day = DateTime.now().setZone(tz).startOf("day");

    for (let i = 0; i < horizon; i++) {
      const dateISO = day.toISODate();
      if (!dateISO) break;
      const r = await loadPublicSlotsForDate(db, uname, input.serviceId, dateISO);
      if (r.ok && r.slots.length > 0) {
        const first = r.slots[0]!;
        return { ok: true, dateISO, slotStart: first.start, slotEnd: first.end };
      }
      day = day.plus({ days: 1 });
    }

    return { ok: false };
  } catch (e) {
    console.error("[suggestPublicBookingSlot] failed", e);
    return { ok: false, error: "Unable to load times. Try again shortly." };
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
  const slotStartIso = formData.get("slotStart")?.toString().trim() ?? "";
  const dateISO = formData.get("dateISO")?.toString().trim() ?? "";
  const customerFirst = plainTextFromInput(formData.get("customerFirstName")?.toString() ?? "", 100);
  const customerLast = plainTextFromInput(formData.get("customerLastName")?.toString() ?? "", 100);
  const legacyName = plainTextFromInput(formData.get("customerName")?.toString() ?? "", 200);
  const customerEmail = plainTextFromInput(formData.get("customerEmail")?.toString() ?? "", 320);
  const customerPhone = plainTextFromInput(formData.get("customerPhone")?.toString() ?? "", 40);
  const customerNotes = plainTextFromInput(formData.get("customerNotes")?.toString() ?? "", 2000);
  const rawPay = plainTextFromInput(formData.get("paymentMethod")?.toString() ?? "", 64).toLowerCase();
  const positioningTierIdRaw = formData.get("positioningTierId")?.toString()?.trim() ?? "";
  const addOnRaw = formData.getAll("addOnIds").map((v) => String(v).trim()).filter(Boolean);

  const trimmedFirst = customerFirst.trim();
  const trimmedLast = customerLast.trim();
  let customerName: string;
  if (trimmedFirst && trimmedLast) {
    customerName = `${trimmedFirst} ${trimmedLast}`.trim().slice(0, 200);
  } else if (legacyName.trim()) {
    customerName = legacyName.trim().slice(0, 200);
  } else {
    return { error: "First name, last name, and a valid email are required." };
  }

  if (!customerEmail.includes("@")) {
    return { error: "A valid email is required." };
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

  if (svc.phoneRequired && !customerPhone.trim()) {
    return { error: "Phone number is required for this service." };
  }
  if (svc.notesRequired && !customerNotes.trim()) {
    return { error: "Please add the information your provider requested in the notes field." };
  }

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
  if (allowed.error) {
    return { error: allowed.error };
  }
  const startMs = startsAt.getTime();
  const okSlot = allowed.slots.some((s) => {
    const t = new Date(s.start).getTime();
    return Number.isFinite(t) && t === startMs;
  });
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

    // Never fail the customer after the booking row exists (queue/Redis issues, etc.).
    try {
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
    } catch (notifyErr) {
      console.error("[submitPublicBooking] notification enqueue failed after booking created", notifyErr);
    }

    return {
      success: String(created.publicReference),
    };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That time was just taken. Pick another slot." };
    }
    console.error("[submitPublicBooking]", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    try {
      await logProviderSignal(db, prov.id, BOOKING_FAILED_SIGNAL_KIND, {
        email: customerEmail,
        phone: customerPhone.trim() || undefined,
        serviceId,
        error: errorMessage,
      });
      await logAudit({
        actorUserId: null,
        actorType: "customer",
        tenantProviderId: prov.id,
        entityType: "booking",
        entityId: serviceId,
        action: "public_submit_failed",
        metadata: { username, serviceId },
      });
      await emitPlatformEvent({
        name: "booking.public_submit_failed",
        aggregateType: "provider",
        aggregateId: prov.id,
        payload: { providerId: prov.id, serviceId },
        tenantProviderId: prov.id,
        actorUserId: null,
        actorType: "system",
      });
    } catch (recordErr) {
      console.error("[submitPublicBooking] provider signal / audit failed", recordErr);
    }
    return { error: "Please try again." };
  }
}
