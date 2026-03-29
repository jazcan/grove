import { and, eq, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { providerDashboardSignals } from "@/db/schema";

/** Customer saw the generic “couldn’t complete the booking” path (server-side failure after validation). */
export const PUBLIC_BOOKING_SUBMIT_FAILED_KIND = "public_booking_submit_failed" as const;

export type ActivePublicBookingFailureSignal = {
  lastSeenAt: Date;
  firstSeenAt: Date;
  occurrenceCount: number;
};

export async function recordPublicBookingSubmitFailed(
  db: Database,
  providerId: string
): Promise<void> {
  const now = new Date();
  await db
    .insert(providerDashboardSignals)
    .values({
      providerId,
      signalKind: PUBLIC_BOOKING_SUBMIT_FAILED_KIND,
      firstSeenAt: now,
      lastSeenAt: now,
      occurrenceCount: 1,
    })
    .onConflictDoUpdate({
      target: [providerDashboardSignals.providerId, providerDashboardSignals.signalKind],
      set: {
        lastSeenAt: now,
        occurrenceCount: sql`${providerDashboardSignals.occurrenceCount} + 1`,
      },
    });
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
        eq(providerDashboardSignals.signalKind, PUBLIC_BOOKING_SUBMIT_FAILED_KIND),
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
        eq(providerDashboardSignals.signalKind, PUBLIC_BOOKING_SUBMIT_FAILED_KIND)
      )
    );
}
