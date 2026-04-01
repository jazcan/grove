/**
 * Client-safe types and constants for provider dashboard signals.
 * Server-only DB logic lives in `provider-dashboard-signals.ts`.
 */

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

/** One attempt in the attention carousel (newest first). */
export type SignalOccurrenceView = {
  seenAtIso: string;
  email: string | null;
  phone: string | null;
  errorSnippet: string | null;
  /** Older attempts without stored contact/error (legacy or before per-attempt history). */
  isInferred: boolean;
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
  /** Browsable attempts for this signal (at least one). */
  occurrences: SignalOccurrenceView[];
};
