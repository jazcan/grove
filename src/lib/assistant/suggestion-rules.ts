import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import type { Database } from "@/db";
import { bookings, providers, services } from "@/db/schema";
import { loadProviderSlotsForServiceDate } from "@/domain/availability/load-provider-slots";
import { getNextSetupStepHref, type ProviderSetupState } from "@/lib/provider-setup-model";
import { MANUAL_BOOKING_WALK_IN_EMAIL } from "@/domain/bookings/create-booking";
import { normalizeEmail } from "@/lib/normalize";
import {
  LAPSED_CUSTOMER_DAYS,
  SCHEDULE_GAP_DAY_SCAN,
  SCHEDULE_GAP_MIN_SLOTS,
  SERVICE_ACTIVITY_DAYS,
  UNPAID_COMPLETED_HOURS,
} from "@/lib/assistant/constants";

const walkInNorm = normalizeEmail(MANUAL_BOOKING_WALK_IN_EMAIL);

export type SuggestionCandidate = {
  dedupeKey: string;
  type: string;
  title: string;
  summary: string;
  priorityScore: number;
  urgencyLevel: "low" | "medium" | "high";
  surfaceMode: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  reasonJson: Record<string, unknown>;
  actionPayloadJson: Record<string, unknown>;
  expiresAt?: Date | null;
};

export async function buildDeterministicSuggestionCandidates(
  db: Database,
  providerId: string,
  timezone: string,
  setup: ProviderSetupState,
  prefs: { disabledSuggestionTypes: string[] }
): Promise<SuggestionCandidate[]> {
  const disabled = new Set(prefs.disabledSuggestionTypes);
  const out: SuggestionCandidate[] = [];

  if (!disabled.has("onboarding_incomplete") && (setup.needsSetup || setup.onboardingTailPending)) {
    const missing: string[] = [];
    if (!setup.hasIdentity) missing.push("profile identity");
    if (!setup.hasServices) missing.push("at least one active service");
    if (!setup.hasAvailability) missing.push("at least one active weekly hours row");
    if (!setup.isPublished) missing.push("public profile");
    if (setup.onboardingTailPending) {
      if (setup.customerCount === 0) missing.push("optional: add customers");
      else missing.push("optional: share your booking link");
    }
    const onlyTail = !setup.needsSetup && setup.onboardingTailPending;
    out.push({
      dedupeKey: onlyTail ? "setup:tail" : "setup:incomplete",
      type: "onboarding_incomplete",
      title: onlyTail ? "Optional next steps" : "Finish setup to take bookings",
      summary:
        missing.length > 0
          ? `${onlyTail ? "When you’re ready: " : "Still needed: "}${missing.join(" · ")}.`
          : "Complete services, availability, and publish your profile.",
      priorityScore: onlyTail ? 85 : 100,
      urgencyLevel: onlyTail ? "medium" : "high",
      surfaceMode: "drawer_card",
      reasonJson: { missing },
      actionPayloadJson: {
        primaryHref: getNextSetupStepHref(setup),
        actions: ["open_setup", "mark_seen", "dismiss", "snooze"],
      },
    });
  }

  if (!disabled.has("payment_outstanding")) {
    const unpaidCutoff = new Date(Date.now() - UNPAID_COMPLETED_HOURS * 60 * 60 * 1000);
    const [row] = await db
      .select({
        id: bookings.id,
        endsAt: bookings.endsAt,
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
      .limit(1);
    if (row) {
      out.push({
        dedupeKey: `unpaid:${row.id}`,
        type: "payment_outstanding",
        title: "Collect payment on a completed visit",
        summary: "A completed booking is still marked unpaid (or partially paid). Update payment when you’ve received funds.",
        priorityScore: 90,
        urgencyLevel: "high",
        surfaceMode: "toast",
        relatedEntityType: "booking",
        relatedEntityId: row.id,
        reasonJson: { bookingId: row.id, endsAt: row.endsAt.toISOString() },
        actionPayloadJson: {
          href: `/dashboard/bookings/${row.id}`,
          actions: ["view_booking", "mark_seen", "dismiss", "snooze"],
        },
      });
    }
  }

  if (!disabled.has("customer_lapsed")) {
    const lapsedCutoffIso = DateTime.now()
      .setZone(timezone)
      .minus({ days: LAPSED_CUSTOMER_DAYS })
      .toJSDate()
      .toISOString();
    const custRows = await db.execute(
      sql`
      SELECT c.id AS id, c.full_name AS name,
        (SELECT max(b.starts_at) FROM bookings b
         WHERE b.customer_id = c.id AND b.provider_id = c.provider_id AND b.status <> 'cancelled') AS last_start
      FROM customers c
      WHERE c.provider_id = ${providerId}::uuid
        AND c.account_ready = true
        AND c.email_normalized <> ${walkInNorm}
        AND (
          SELECT max(b.starts_at)
          FROM bookings b
          WHERE b.customer_id = c.id AND b.provider_id = c.provider_id AND b.status <> 'cancelled'
        ) < ${lapsedCutoffIso}::timestamptz
      ORDER BY last_start ASC
      LIMIT 1
    `
    );
    const crow = (custRows as unknown as { id: string; name: string; last_start: Date }[])[0];
    if (crow) {
      const lastLabel = DateTime.fromJSDate(new Date(crow.last_start)).setZone(timezone).toLocaleString(
        DateTime.DATE_MED
      );
      out.push({
        dedupeKey: `lapsed:${crow.id}`,
        type: "customer_lapsed",
        title: `Reconnect with ${crow.name}`,
        summary: `Last booking was ${lastLabel} (${LAPSED_CUSTOMER_DAYS}+ days ago). A quick follow-up can bring them back.`,
        priorityScore: 55,
        urgencyLevel: "medium",
        surfaceMode: "drawer_card",
        relatedEntityType: "customer",
        relatedEntityId: crow.id,
        reasonJson: { customerId: crow.id, lastBookingAt: new Date(crow.last_start).toISOString() },
        actionPayloadJson: {
          href: `/dashboard/customers/${crow.id}`,
          actions: ["view_customer", "draft_followup", "dismiss", "snooze"],
        },
      });
    }
  }

  if (!disabled.has("service_low_activity")) {
    const thirtyAgoIso = DateTime.now()
      .setZone(timezone)
      .minus({ days: SERVICE_ACTIVITY_DAYS })
      .toJSDate()
      .toISOString();
    const svcRows = await db.execute(
      sql`
      SELECT s.id, s.name
      FROM services s
      WHERE s.provider_id = ${providerId}::uuid AND s.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.service_id = s.id AND b.provider_id = s.provider_id
            AND b.status <> 'cancelled' AND b.starts_at >= ${thirtyAgoIso}::timestamptz
        )
      ORDER BY s.sort_order ASC, s.name ASC
      LIMIT 3
    `
    );
    const srows = svcRows as unknown as { id: string; name: string }[];
    for (const s of srows) {
      out.push({
        dedupeKey: `low_activity:${s.id}`,
        type: "service_low_activity",
        title: `Boost "${s.name}"`,
        summary: `No bookings in the last ${SERVICE_ACTIVITY_DAYS} days. Review pricing, description, or promote this service.`,
        priorityScore: 35,
        urgencyLevel: "low",
        surfaceMode: "drawer_card",
        relatedEntityType: "service",
        relatedEntityId: s.id,
        reasonJson: { serviceId: s.id, windowDays: SERVICE_ACTIVITY_DAYS },
        actionPayloadJson: {
          href: "/dashboard/services",
          actions: ["review_service", "mark_seen", "dismiss", "snooze"],
        },
      });
    }
  }

  if (!disabled.has("schedule_gap")) {
    const [prov] = await db
      .select({ bookingsPaused: providers.bookingsPaused })
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1);
    if (!prov?.bookingsPaused) {
      const [shortSvc] = await db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.providerId, providerId), eq(services.isActive, true)))
        .orderBy(asc(services.durationMinutes), asc(services.name))
        .limit(1);
      if (shortSvc) {
        let best: { dateISO: string; slots: number } | null = null;
        for (let d = 0; d < SCHEDULE_GAP_DAY_SCAN; d++) {
          const day = DateTime.now().setZone(timezone).plus({ days: d }).toFormat("yyyy-MM-dd");
          const res = await loadProviderSlotsForServiceDate(db, {
            providerId,
            serviceId: shortSvc.id,
            dateISO: day,
          });
          if (res.ok && res.slots.length >= SCHEDULE_GAP_MIN_SLOTS) {
            if (!best || res.slots.length > best.slots) {
              best = { dateISO: day, slots: res.slots.length };
            }
          }
        }
        if (best) {
          const pretty = DateTime.fromISO(best.dateISO, { zone: timezone }).toLocaleString({
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          out.push({
            dedupeKey: `gap:${best.dateISO}`,
            type: "schedule_gap",
            title: "Open time on your calendar",
            summary: `About ${best.slots} bookable slots on ${pretty} (based on your shortest service). Use this window to fill the day.`,
            priorityScore: 45,
            urgencyLevel: "medium",
            surfaceMode: "drawer_card",
            reasonJson: { dateISO: best.dateISO, slotCount: best.slots, serviceId: shortSvc.id },
            actionPayloadJson: {
              href: "/dashboard/availability",
              actions: ["open_availability", "mark_seen", "dismiss", "snooze"],
            },
          });
        }
      }
    }
  }

  return out;
}
