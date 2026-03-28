/**
 * Canonical string unions for Postgres enums and Zod.
 * Drizzle `pgEnum` definitions in `src/db/schema.ts` import these tuples.
 */
export const USER_ROLES = ["provider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

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
