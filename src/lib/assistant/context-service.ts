import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import type { Database } from "@/db";
import {
  assistantEvents,
  assistantPreferences,
  assistantSuggestions,
  bookings,
  customers,
  providers,
  services,
} from "@/db/schema";
import { loadProviderSetupState } from "@/lib/provider-setup";
import type { ProviderSetupState } from "@/lib/provider-setup-model";
import { MANUAL_BOOKING_WALK_IN_EMAIL } from "@/domain/bookings/create-booking";
import { normalizeEmail } from "@/lib/normalize";
import { LAPSED_CUSTOMER_DAYS, SERVICE_ACTIVITY_DAYS, UNPAID_COMPLETED_HOURS } from "@/lib/assistant/constants";
import { normalizeDates } from "@/lib/normalize-dates";

export type TodayBookingRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  paymentStatus: string;
  serviceName: string;
  customerName: string;
};

export type AssistantContextPacket = {
  timezone: string;
  setup: ProviderSetupState;
  todayBookings: TodayBookingRow[];
  /** Upcoming non-cancelled bookings starting today (local), ordered by time. */
  unpaidCompletedSample: { id: string; endsAt: string; paymentStatus: string }[];
  lapsedCustomerCount: number;
  lowActivityServiceCount: number;
  recentEvents: { id: string; eventType: string; createdAt: string; payload: Record<string, unknown> }[];
  activeSuggestionsPreview: {
    id: string;
    type: string;
    title: string;
    status: string;
    urgencyLevel: string;
    dedupeKey: string;
  }[];
  preferences: { disabledSuggestionTypes: string[]; quietMode: boolean };
};

const walkInNorm = normalizeEmail(MANUAL_BOOKING_WALK_IN_EMAIL);

export async function buildAssistantContextPacket(
  db: Database,
  providerId: string,
  timezone: string
): Promise<AssistantContextPacket> {
  const setup = await loadProviderSetupState(db, providerId, timezone);

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const endOfToday = DateTime.now().setZone(timezone).endOf("day");

  const todayBookingRows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      serviceName: services.name,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.providerId, providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    )
    .orderBy(asc(bookings.startsAt));

  const todayBookings: TodayBookingRow[] = todayBookingRows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    status: r.status,
    paymentStatus: r.paymentStatus,
    serviceName: r.serviceName,
    customerName: r.customerName,
  }));

  const unpaidCutoff = new Date(Date.now() - UNPAID_COMPLETED_HOURS * 60 * 60 * 1000);
  const unpaidCompleted = await db
    .select({
      id: bookings.id,
      endsAt: bookings.endsAt,
      paymentStatus: bookings.paymentStatus,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        eq(bookings.status, "completed"),
        inArray(bookings.paymentStatus, ["unpaid", "partially_paid"]),
        lte(bookings.endsAt, unpaidCutoff)
      )
    )
    .orderBy(desc(bookings.endsAt))
    .limit(8);

  const lapsedCutoff = DateTime.now().setZone(timezone).minus({ days: LAPSED_CUSTOMER_DAYS }).toJSDate();
  const lapsedCutoffIso = lapsedCutoff.toISOString();

  const lapsedRes = await db.execute(
    sql`
    SELECT count(*)::int AS n
    FROM customers c
    WHERE c.provider_id = ${providerId}::uuid
      AND c.account_ready = true
      AND c.email_normalized <> ${walkInNorm}
      AND (
        SELECT max(b.starts_at)
        FROM bookings b
        WHERE b.customer_id = c.id
          AND b.provider_id = c.provider_id
          AND b.status <> 'cancelled'
      ) IS NOT NULL
      AND (
        SELECT max(b.starts_at)
        FROM bookings b
        WHERE b.customer_id = c.id
          AND b.provider_id = c.provider_id
          AND b.status <> 'cancelled'
      ) < ${lapsedCutoffIso}::timestamptz
  `
  );
  const lapsedFirst = (lapsedRes as unknown as { n: number }[])[0];
  const lapsedCustomerCount = Number(lapsedFirst?.n ?? 0);

  const thirtyAgo = DateTime.now().setZone(timezone).minus({ days: SERVICE_ACTIVITY_DAYS }).toJSDate();
  const thirtyAgoIso = thirtyAgo.toISOString();
  const lowRes = await db.execute(
    sql`
    SELECT count(*)::int AS n
    FROM services s
    WHERE s.provider_id = ${providerId}::uuid
      AND s.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.service_id = s.id
          AND b.provider_id = s.provider_id
          AND b.status <> 'cancelled'
          AND b.starts_at >= ${thirtyAgoIso}::timestamptz
      )
  `
  );
  const lowFirst = (lowRes as unknown as { n: number }[])[0];
  const lowActivityServiceCount = Number(lowFirst?.n ?? 0);

  /** Assistant tables may not exist until migration `0015_assistant_foundation.sql` is applied. */
  let recentEvents: AssistantContextPacket["recentEvents"] = [];
  let activeSuggestionsPreview: AssistantContextPacket["activeSuggestionsPreview"] = [];
  let preferences: AssistantContextPacket["preferences"] = {
    disabledSuggestionTypes: [],
    quietMode: false,
  };

  try {
    const evRows = await db
      .select({
        id: assistantEvents.id,
        eventType: assistantEvents.eventType,
        createdAt: assistantEvents.createdAt,
        payload: assistantEvents.payload,
      })
      .from(assistantEvents)
      .where(eq(assistantEvents.providerId, providerId))
      .orderBy(desc(assistantEvents.createdAt))
      .limit(12);

    recentEvents = evRows.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      payload: normalizeDates(e.payload) as Record<string, unknown>,
    }));

    const sugRows = await db
      .select({
        id: assistantSuggestions.id,
        type: assistantSuggestions.type,
        title: assistantSuggestions.title,
        status: assistantSuggestions.status,
        urgencyLevel: assistantSuggestions.urgencyLevel,
        dedupeKey: assistantSuggestions.dedupeKey,
      })
      .from(assistantSuggestions)
      .where(
        and(
          eq(assistantSuggestions.providerId, providerId),
          or(
            inArray(assistantSuggestions.status, ["new", "seen"]),
            and(
              eq(assistantSuggestions.status, "snoozed"),
              or(
                isNull(assistantSuggestions.snoozedUntil),
                lte(assistantSuggestions.snoozedUntil, new Date())
              )
            )
          )
        )
      )
      .orderBy(desc(assistantSuggestions.priorityScore), desc(assistantSuggestions.createdAt))
      .limit(24);

    activeSuggestionsPreview = sugRows.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      status: s.status,
      urgencyLevel: s.urgencyLevel,
      dedupeKey: s.dedupeKey,
    }));

    const [pref] = await db
      .select()
      .from(assistantPreferences)
      .where(eq(assistantPreferences.providerId, providerId))
      .limit(1);
    preferences = {
      disabledSuggestionTypes: pref?.disabledSuggestionTypes ?? [],
      quietMode: pref?.quietMode ?? false,
    };
  } catch (e) {
    console.warn(
      "[assistant] assistant tables unavailable (apply drizzle/0015_assistant_foundation.sql). Context falls back without assistant history.",
      e
    );
  }

  return normalizeDates({
    timezone,
    setup,
    todayBookings,
    unpaidCompletedSample: unpaidCompleted.map((u) => ({
      id: u.id,
      endsAt: u.endsAt.toISOString(),
      paymentStatus: u.paymentStatus,
    })),
    lapsedCustomerCount,
    lowActivityServiceCount,
    recentEvents,
    activeSuggestionsPreview,
    preferences,
  }) as AssistantContextPacket;
}

export async function getProviderTimezone(db: Database, providerId: string): Promise<string> {
  const [p] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  return p?.timezone ?? "America/Toronto";
}
