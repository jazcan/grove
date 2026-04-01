import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { providerDashboardSignals } from "@/db/schema";
import {
  collectPostgresErrorText,
  isRecoverableProviderDashboardSignalsError,
} from "@/domain/schema-health";
import type {
  ActivePublicBookingFailureSignal,
  PresentedProviderSignal,
  ProviderSignalApiRow,
  ProviderSignalCta,
  SignalOccurrenceView,
} from "@/domain/provider-dashboard-signals.shared";
import { BOOKING_FAILED_SIGNAL_KIND } from "@/domain/provider-dashboard-signals.shared";

export * from "@/domain/provider-dashboard-signals.shared";

function coerceAttemptSnapshot(raw: unknown): {
  at?: string;
  email?: string;
  phone?: string;
  error?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    at: typeof o.at === "string" ? o.at : undefined,
    email: typeof o.email === "string" ? o.email : undefined,
    phone: typeof o.phone === "string" ? o.phone : undefined,
    error: typeof o.error === "string" ? o.error : undefined,
  };
}

export function buildBookingFailedOccurrenceViews(
  row: ProviderSignalApiRow,
  latestEmail: string | null,
  latestPhone: string | null
): SignalOccurrenceView[] {
  const meta = row.metadata ?? {};
  const n = Math.max(1, row.occurrenceCount);
  const metaErr = typeof meta.error === "string" ? meta.error.slice(0, 280) : null;

  const fromHistory: SignalOccurrenceView[] = [];
  if (Array.isArray(meta.recentAttempts)) {
    for (const raw of meta.recentAttempts) {
      const a = coerceAttemptSnapshot(raw);
      if (!a) continue;
      fromHistory.push({
        seenAtIso: a.at ?? row.lastSeenAt.toISOString(),
        email: a.email?.trim() ? a.email.trim() : null,
        phone: a.phone?.trim() ? a.phone.trim() : null,
        errorSnippet: a.error ? a.error.slice(0, 280) : null,
        isInferred: false,
      });
    }
  }

  if (fromHistory.length >= n) {
    return fromHistory.slice(0, n);
  }

  if (fromHistory.length > 0) {
    const pad = n - fromHistory.length;
    const padded: SignalOccurrenceView[] = [...fromHistory];
    for (let i = 0; i < pad; i++) {
      padded.push({
        seenAtIso: row.firstSeenAt.toISOString(),
        email: null,
        phone: null,
        errorSnippet: null,
        isInferred: true,
      });
    }
    return padded.slice(0, n);
  }

  return Array.from({ length: n }, (_, i) => ({
    seenAtIso: i === 0 ? row.lastSeenAt.toISOString() : row.firstSeenAt.toISOString(),
    email: i === 0 ? latestEmail : null,
    phone: i === 0 ? latestPhone : null,
    errorSnippet: i === 0 ? metaErr : null,
    isInferred: i > 0,
  }));
}

function isPostgresUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  );
}

/**
 * Upsert a provider signal: same provider + kind increments count and refreshes last_seen_at,
 * merging a rolling `recentAttempts` list for per-attempt context (newest first).
 */
export async function logProviderSignal(
  db: Database,
  providerId: string,
  signalKind: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const now = new Date();
  const snapshot: Record<string, unknown> = {
    at: now.toISOString(),
  };
  if (typeof metadata.email === "string") snapshot.email = metadata.email;
  if (typeof metadata.phone === "string") snapshot.phone = metadata.phone;
  if (metadata.serviceId != null) snapshot.serviceId = metadata.serviceId;
  if (typeof metadata.error === "string") snapshot.error = metadata.error.slice(0, 500);

  const runOnce = async () => {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(providerDashboardSignals)
        .where(
          and(eq(providerDashboardSignals.providerId, providerId), eq(providerDashboardSignals.signalKind, signalKind))
        )
        .for("update")
        .limit(1);

      const prevMeta = (existing?.metadata as Record<string, unknown> | undefined) ?? {};
      const prevAttempts = Array.isArray(prevMeta.recentAttempts)
        ? [...(prevMeta.recentAttempts as unknown[])]
        : [];
      const recentAttempts = [snapshot, ...prevAttempts].slice(0, 20);
      const mergedMeta: Record<string, unknown> = { ...metadata, recentAttempts };

      if (existing) {
        await tx
          .update(providerDashboardSignals)
          .set({
            lastSeenAt: now,
            occurrenceCount: sql`${providerDashboardSignals.occurrenceCount} + 1`,
            metadata: mergedMeta,
          })
          .where(eq(providerDashboardSignals.id, existing.id));
      } else {
        await tx.insert(providerDashboardSignals).values({
          providerId,
          signalKind,
          metadata: mergedMeta,
          firstSeenAt: now,
          lastSeenAt: now,
          occurrenceCount: 1,
        });
      }
    });
  };

  try {
    await runOnce();
  } catch (e) {
    if (isRecoverableProviderDashboardSignalsError(e)) {
      console.warn(
        "[logProviderSignal] Skipping signal write (schema behind migrations). Apply drizzle/0009_provider_dashboard_signals_metadata.sql —",
        collectPostgresErrorText(e)
      );
      return;
    }
    if (isPostgresUniqueViolation(e)) {
      try {
        await runOnce();
      } catch (e2) {
        if (isRecoverableProviderDashboardSignalsError(e2)) {
          console.warn(
            "[logProviderSignal] Skipping signal write (schema behind migrations). Apply drizzle/0009_provider_dashboard_signals_metadata.sql —",
            collectPostgresErrorText(e2)
          );
          return;
        }
        throw e2;
      }
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

    const contactEmail = email?.trim() ?? null;
    const contactPhone = phone?.trim() ?? null;

    return {
      ...base,
      title: "A customer couldn't complete a booking",
      description:
        "Someone in your community tried to book, but it didn’t go through. Check your profile and availability.",
      contactEmail,
      contactPhone,
      cta,
      secondaryCta: { label: "Review booking page", href: "/dashboard/profile" },
      occurrences: buildBookingFailedOccurrenceViews(row, contactEmail, contactPhone),
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
    occurrences: [
      {
        seenAtIso: row.lastSeenAt.toISOString(),
        email: null,
        phone: null,
        errorSnippet: null,
        isInferred: false,
      },
    ],
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
