/** Days without a repeat visit before we surface a lapsed-customer suggestion. */
export const LAPSED_CUSTOMER_DAYS = 90;

/** Completed bookings unpaid longer than this may trigger a payment follow-up suggestion. */
export const UNPAID_COMPLETED_HOURS = 24;

/** Window for "recent" service booking counts. */
export const SERVICE_ACTIVITY_DAYS = 30;

/** Minimum open slots in a day (for shortest-duration active service) to flag a schedule gap. */
export const SCHEDULE_GAP_MIN_SLOTS = 4;

/** How many upcoming local days to scan for schedule gaps. */
export const SCHEDULE_GAP_DAY_SCAN = 5;

/** Suggestion types managed by deterministic sync (used for expiry). */
export const MANAGED_SUGGESTION_TYPES = [
  "onboarding_incomplete",
  "schedule_gap",
  "customer_lapsed",
  "payment_outstanding",
  "service_low_activity",
] as const;

export type ManagedSuggestionType = (typeof MANAGED_SUGGESTION_TYPES)[number];
