/**
 * Canonical string unions for Postgres enums and Zod.
 * Drizzle `pgEnum` definitions in `src/db/schema.ts` import these tuples.
 */
export const USER_ROLES = ["provider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Login / handoff lifecycle for admin-seeded provider accounts (`users.is_seeded_account`). */
export const HANDOFF_STATUSES = ["none", "seeded", "invited", "claimed"] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

/** Local Ambassador direct referral lifecycle (`provider_referrals.status`). */
export const PROVIDER_REFERRAL_STATUSES = ["invited", "signed_up", "activated"] as const;
export type ProviderReferralStatus = (typeof PROVIDER_REFERRAL_STATUSES)[number];

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid", "waived", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PRICING_TYPES = ["fixed", "hourly"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

/** Who caused a platform event (distinct from audit `actorType`; includes future automation). */
export const PLATFORM_EVENT_ACTORS = ["user", "system", "customer", "automation"] as const;
export type PlatformEventActor = (typeof PLATFORM_EVENT_ACTORS)[number];

/** Provider follow-on / upsell recommendations tracked at customer level. */
export const CUSTOMER_RECOMMENDATION_STATUSES = [
  "open",
  "booked",
  "completed",
  "declined",
  "archived",
] as const;
export type CustomerRecommendationStatus = (typeof CUSTOMER_RECOMMENDATION_STATUSES)[number];

export const CUSTOMER_RECOMMENDATION_TIMEFRAMES = [
  "asap",
  "within_30_days",
  "next_visit",
  "seasonal",
  "custom",
] as const;
export type CustomerRecommendationTimeframe = (typeof CUSTOMER_RECOMMENDATION_TIMEFRAMES)[number];

/** Assistant suggestion lifecycle (persisted). */
export const ASSISTANT_SUGGESTION_STATUSES = [
  "new",
  "seen",
  "acted",
  "dismissed",
  "snoozed",
  "expired",
] as const;
export type AssistantSuggestionStatus = (typeof ASSISTANT_SUGGESTION_STATUSES)[number];

export const ASSISTANT_URGENCY_LEVELS = ["low", "medium", "high"] as const;
export type AssistantUrgencyLevel = (typeof ASSISTANT_URGENCY_LEVELS)[number];

export const ASSISTANT_MESSAGE_ROLES = ["user", "assistant"] as const;
export type AssistantMessageRole = (typeof ASSISTANT_MESSAGE_ROLES)[number];

/** Income row payment channel (mapped from booking `payment_method` free text). */
export const INCOME_PAYMENT_METHODS = ["cash", "e_transfer", "terminal", "other"] as const;
export type IncomePaymentMethod = (typeof INCOME_PAYMENT_METHODS)[number];

export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Stored on `income_records.source_amount_type` (app-enforced, not a DB enum). */
export const INCOME_SOURCE_AMOUNT_TYPES = ["payment_amount", "computed_price"] as const;
export type IncomeSourceAmountType = (typeof INCOME_SOURCE_AMOUNT_TYPES)[number];

/** Expense categories (app validation only; DB stores varchar). */
export const EXPENSE_CATEGORIES = ["supplies", "travel", "rent", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
