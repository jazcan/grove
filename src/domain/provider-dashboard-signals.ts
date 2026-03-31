import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { providerDashboardSignals } from "@/db/schema";
import {
  collectPostgresErrorText,
  isRecoverableProviderDashboardSignalsError,
} from "@/domain/schema-health";

/** Public booking flow failed after validation (server error, DB, etc.). */
export const BOOKING_FAILED_SIGNAL_KIND = "booking_failed" as const;

export type ActivePublicBookingFailureSignal = {
  lastSeenAt: Date;
  firstSeenAt: Date;
  occurrenceCount: number;
};

export type ProviderSignalApiRow = {
  id: string;
  signalKind: string;
  metadata: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  dismissedAt: Date | null;
};

export type ProviderSignalCta = {
  label: string;
  href: string;
};

/** UI-facing shape for dashboard and `GET /api/provider/signals`. */
export type PresentedProviderSignal = {
  id: string;
  signalKind: string;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  title: string;
  description: string;
  cta: ProviderSignalCta | null;
  contactEmail: string | null;
  contactPhone: string | null;
  secondaryCta: ProviderSignalCta | null;
};

/**
 * Upsert a provider signal: same provider + kind increments count and refreshes last_seen_at
 * and metadata (latest attempt wins for contextual fields).
 */
export async function logProviderSignal(
  db: Database,
  providerId: string,
  signalKind: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const now = new Date();
  try {
    await db
      .insert(providerDashboardSignals)
      .values({
        providerId,
        signalKind,
        metadata,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrenceCount: 1,
      })
      .onConflictDoUpdate({
        target: [providerDashboardSignals.providerId, providerDashboardSignals.signalKind],
        set: {
          lastSeenAt: now,
          occurrenceCount: sql`${providerDashboardSignals.occurrenceCount} + 1`,
          metadata: sql`EXCLUDED.metadata`,
        },
      });
  } catch (e) {
    if (isRecoverableProviderDashboardSignalsError(e)) {
      console.warn(
        "[logProviderSignal] Skipping signal write (schema behind migrations). Apply drizzle/0009_provider_dashboard_signals_metadata.sql —",
        collectPostgresErrorText(e)
      );
      return;
    }
    throw e;
  }
}

export function presentProviderSignal(row: ProviderSignalApiRow): PresentedProviderSignal {
  const base = {
    id: row.id,
    signalKind: row.signalKind,
    metadata: row.metadata,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    occurrenceCount: row.occurrenceCount,
  };

  if (row.signalKind === BOOKING_FAILED_SIGNAL_KIND) {
    const meta = row.metadata ?? {};
    const email = typeof meta.email === "string" ? meta.email : undefined;
    const phone = typeof meta.phone === "string" ? meta.phone : undefined;

    let cta: ProviderSignalCta | null = null;
    if (email?.trim()) {
      cta = { label: "Contact customer", href: `mailto:${encodeURIComponent(email.trim())}` };
    } else if (phone?.trim()) {
      const digits = phone.replace(/[^\d+]/g, "");
      cta = digits ? { label: "Contact customer", href: `tel:${digits}` } : null;
    }

    return {
      ...base,
      title: "A customer couldn't complete a booking",
      description:
        "Someone tried to book through your public page but the request did not complete. Check your profile and availability.",
      contactEmail: email?.trim() ?? null,
      contactPhone: phone?.trim() ?? null,
      cta,
      secondaryCta: { label: "View details", href: "/dashboard/profile" },
    };
  }

  return {
    ...base,
    title: row.signalKind,
    description: "Open your dashboard for more context.",
    contactEmail: null,
    contactPhone: null,
    cta: null,
    secondaryCta: null,
  };
}

/** Active signals (not dismissed, or new activity after dismiss), newest first. */
export async function fetchPresentedProviderSignals(
  db: Database,
  providerId: string
): Promise<PresentedProviderSignal[]> {
  try {
    const rows = await db
      .select({
        id: providerDashboardSignals.id,
        signalKind: providerDashboardSignals.signalKind,
        metadata: providerDashboardSignals.metadata,
        firstSeenAt: providerDashboardSignals.firstSeenAt,
        lastSeenAt: providerDashboardSignals.lastSeenAt,
        occurrenceCount: providerDashboardSignals.occurrenceCount,
        dismissedAt: providerDashboardSignals.dismissedAt,
      })
      .from(providerDashboardSignals)
      .where(
        and(
          eq(providerDashboardSignals.providerId, providerId),
          or(
            sql`${providerDashboardSignals.dismissedAt} is null`,
            sql`${providerDashboardSignals.lastSeenAt} > ${providerDashboardSignals.dismissedAt}`
          )
        )
      )
      .orderBy(desc(providerDashboardSignals.lastSeenAt));

    return rows.map((r) =>
      presentProviderSignal({
        id: r.id,
        signalKind: r.signalKind,
        metadata: r.metadata ?? {},
        firstSeenAt: r.firstSeenAt,
        lastSeenAt: r.lastSeenAt,
        occurrenceCount: r.occurrenceCount,
        dismissedAt: r.dismissedAt,
      })
    );
  } catch (e) {
    if (isRecoverableProviderDashboardSignalsError(e)) {
      console.warn(
        "[fetchPresentedProviderSignals] Returning no signals (schema behind migrations). Apply drizzle/0009_provider_dashboard_signals_metadata.sql —",
        collectPostgresErrorText(e)
      );
      return [];
    }
    throw e;
  }
}

export async function getActivePublicBookingFailureSignal(
  db: Database,
  providerId: string
): Promise<ActivePublicBookingFailureSignal | null> {
  const [row] = await db
    .select({
      lastSeenAt: providerDashboardSignals.lastSeenAt,
      firstSeenAt: providerDashboardSignals.firstSeenAt,
      occurrenceCount: providerDashboardSignals.occurrenceCount,
    })
    .from(providerDashboardSignals)
    .where(
      and(
        eq(providerDashboardSignals.providerId, providerId),
        eq(providerDashboardSignals.signalKind, BOOKING_FAILED_SIGNAL_KIND),
        or(
          sql`${providerDashboardSignals.dismissedAt} is null`,
          sql`${providerDashboardSignals.lastSeenAt} > ${providerDashboardSignals.dismissedAt}`
        )
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    lastSeenAt: row.lastSeenAt,
    firstSeenAt: row.firstSeenAt,
    occurrenceCount: row.occurrenceCount,
  };
}

export async function dismissPublicBookingFailureSignal(
  db: Database,
  providerId: string
): Promise<void> {
  await db
    .update(providerDashboardSignals)
    .set({ dismissedAt: new Date() })
    .where(
      and(
        eq(providerDashboardSignals.providerId, providerId),
        eq(providerDashboardSignals.signalKind, BOOKING_FAILED_SIGNAL_KIND)
      )
    );
}
