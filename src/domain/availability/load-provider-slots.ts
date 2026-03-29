import { and, eq, ne } from "drizzle-orm";
import type { Database } from "@/db";
import {
  availabilityRules,
  blockedTimes,
  bookings,
  providers,
  services,
} from "@/db/schema";
import { generateSlots } from "@/domain/availability/slots";

export type ProviderSlotsResult =
  | { ok: true; slots: { start: string; end: string }[] }
  | { ok: false; reason: "no_service" };

/**
 * Bookable slots for a provider’s service on a calendar day (same rules as public booking).
 * Used by dashboard manual booking; does not require a public profile or active bookings.
 */
export async function loadProviderSlotsForServiceDate(
  db: Database,
  input: { providerId: string; serviceId: string; dateISO: string }
): Promise<ProviderSlotsResult> {
  const [prov] = await db
    .select({
      id: providers.id,
      timezone: providers.timezone,
      bookingLeadTimeMinutes: providers.bookingLeadTimeMinutes,
      bookingHorizonDays: providers.bookingHorizonDays,
    })
    .from(providers)
    .where(eq(providers.id, input.providerId))
    .limit(1);
  if (!prov) return { ok: false, reason: "no_service" };

  const [svc] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, input.serviceId),
        eq(services.providerId, input.providerId),
        eq(services.isActive, true)
      )
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
    ok: true,
    slots: slotList.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    })),
  };
}
