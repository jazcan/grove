import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
  varchar,
  decimal,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  ASSISTANT_MESSAGE_ROLES,
  ASSISTANT_SUGGESTION_STATUSES,
  ASSISTANT_URGENCY_LEVELS,
  BOOKING_STATUSES,
  INCOME_PAYMENT_METHODS,
  INVOICE_STATUSES,
  CUSTOMER_RECOMMENDATION_STATUSES,
  CUSTOMER_RECOMMENDATION_TIMEFRAMES,
  PAYMENT_STATUSES,
  PRICING_TYPES,
  PLATFORM_EVENT_ACTORS,
  USER_ROLES,
  HANDOFF_STATUSES,
  PROVIDER_REFERRAL_STATUSES,
} from "@/platform/enums";
import type { TemplateAddOn, TemplateOutcome, TemplateStep } from "@/platform/templates/structure";

export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const handoffStatusEnum = pgEnum("handoff_status", HANDOFF_STATUSES);

export const providerReferralStatusEnum = pgEnum("provider_referral_status", PROVIDER_REFERRAL_STATUSES);

export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);

export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);

export const pricingTypeEnum = pgEnum("pricing_type", PRICING_TYPES);

export const platformEventActorEnum = pgEnum("platform_event_actor", PLATFORM_EVENT_ACTORS);

export const customerRecommendationStatusEnum = pgEnum(
  "customer_recommendation_status",
  CUSTOMER_RECOMMENDATION_STATUSES
);

export const customerRecommendationTimeframeEnum = pgEnum(
  "customer_recommendation_timeframe",
  CUSTOMER_RECOMMENDATION_TIMEFRAMES
);

export const assistantSuggestionStatusEnum = pgEnum(
  "assistant_suggestion_status",
  ASSISTANT_SUGGESTION_STATUSES
);

export const assistantUrgencyEnum = pgEnum("assistant_urgency", ASSISTANT_URGENCY_LEVELS);

export const assistantMessageRoleEnum = pgEnum("assistant_message_role", ASSISTANT_MESSAGE_ROLES);

export const incomePaymentMethodEnum = pgEnum("income_payment_method", INCOME_PAYMENT_METHODS);

export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  role: userRoleEnum("role").notNull().default("provider"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  /** True when the account was created from the internal admin seeding tool (not public signup). */
  isSeededAccount: boolean("is_seeded_account").notNull().default(false),
  handoffStatus: handoffStatusEnum("handoff_status").notNull().default("none"),
  /** Target login email before handoff is triggered; cleared after email is moved to `email`. */
  handoffToEmail: varchar("handoff_to_email", { length: 320 }),
  handoffSentAt: timestamp("handoff_sent_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 64 }).notNull().unique(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    businessName: varchar("business_name", { length: 200 }),
    bio: text("bio").notNull().default(""),
    category: varchar("category", { length: 120 }).notNull().default(""),
    city: varchar("city", { length: 120 }).notNull().default(""),
    /** ISO 3166-1 alpha-2 (e.g. CA, US). Used for discovery and geocoding. */
    countryCode: varchar("country_code", { length: 2 }),
    /** Province, state, or region label (e.g. ON, California). */
    region: varchar("region", { length: 120 }),
    /** Normalized postal / ZIP (spacing stripped where possible). */
    postalCode: varchar("postal_code", { length: 20 }),
    /** Geocoded from base location; used for radius search. Filled on profile save when geocoding succeeds. */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    serviceArea: text("service_area").notNull().default(""),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    publicProfileEnabled: boolean("public_profile_enabled").notNull().default(false),
    discoverable: boolean("discoverable").notNull().default(false),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Toronto"),
    paymentCash: boolean("payment_cash").notNull().default(true),
    paymentEtransfer: boolean("payment_etransfer").notNull().default(false),
    /** In-person card / tap-to-pay; shown to clients as “In person credit/debit”. */
    paymentInPersonCreditDebit: boolean("payment_in_person_credit_debit").notNull().default(false),
    etransferDetails: text("etransfer_details").notNull().default(""),
    paymentDueBeforeAppointment: boolean("payment_due_before").notNull().default(false),
    cancellationPolicy: text("cancellation_policy").notNull().default(""),
    reminder24h: boolean("reminder_24h").notNull().default(true),
    reminder2h: boolean("reminder_2h").notNull().default(false),
    profileImageKey: text("profile_image_key"),
    /** Public website (https…); shown on profile when set. */
    websiteUrl: text("website_url"),
    socialFacebookUrl: text("social_facebook_url"),
    socialInstagramUrl: text("social_instagram_url"),
    socialYoutubeUrl: text("social_youtube_url"),
    socialTiktokUrl: text("social_tiktok_url"),
    bookingLeadTimeMinutes: integer("booking_lead_time_minutes").notNull().default(60),
    bookingHorizonDays: integer("booking_horizon_days").notNull().default(60),
    /** When true, public booking pages show no slots and submissions are rejected (temporary pause). */
    bookingsPaused: boolean("bookings_paused").notNull().default(false),
    /**
     * Remembered default for new services: whether "Enable service levels" is checked on create.
     * Updated when the provider saves any service with that toggle.
     */
    defaultServiceLevelsEnabled: boolean("default_service_levels_enabled").notNull().default(false),
    /** Set when the provider has committed a public page address (onboarding or first profile save). */
    usernameLockedAt: timestamp("username_locked_at", { withTimezone: true }),
    /** First-run checklist: provider finished customers step + share prompt (or skipped). Null = tail not completed. */
    onboardingWalkthroughCompletedAt: timestamp("onboarding_walkthrough_completed_at", {
      withTimezone: true,
    }),
    /** Internal-only notes for admin seeding / handoff (never shown on public profile). */
    internalAdminNotes: text("internal_admin_notes"),
    /** Stable shareable code for the Local Ambassador referral link (uppercase alphanumeric). Nullable until backfilled. */
    referralCode: varchar("referral_code", { length: 16 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("providers_discoverable_idx").on(t.discoverable, t.publicProfileEnabled)]
);

/** Direct provider-to-provider referrals (Local Ambassador). One row per referred provider when attributed. */
export const providerReferrals = pgTable(
  "provider_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerProviderId: uuid("referrer_provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    referredProviderId: uuid("referred_provider_id").references(() => providers.id, { onDelete: "cascade" }),
    referredEmail: varchar("referred_email", { length: 320 }),
    referralCodeUsed: varchar("referral_code_used", { length: 16 }).notNull(),
    status: providerReferralStatusEnum("status").notNull().default("signed_up"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    signedUpAt: timestamp("signed_up_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_referrals_referred_uidx").on(t.referredProviderId),
    index("provider_referrals_referrer_idx").on(t.referrerProviderId),
  ]
);

/** Up to five promo codes per provider (enforced in application logic). */
export const providerDiscountCodes = pgTable(
  "provider_discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    /** Percent off the pre-tip subtotal (service + add-ons), e.g. 10 = 10%. */
    discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("10"),
    oneTimeUse: boolean("one_time_use").notNull().default(false),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_discount_codes_provider_code_uidx").on(t.providerId, t.code),
    index("provider_discount_codes_provider_idx").on(t.providerId),
  ]
);

/** Deduplicated provider-facing signals for dashboard banners (e.g. public booking failures). */
export const providerDashboardSignals = pgTable(
  "provider_dashboard_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    signalKind: varchar("signal_kind", { length: 64 }).notNull(),
    /** Latest context for this signal (e.g. contact info, error text); updated on each occurrence. */
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("provider_dashboard_signals_provider_kind_uidx").on(t.providerId, t.signalKind),
    index("provider_dashboard_signals_provider_idx").on(t.providerId),
  ]
);

/** Shopify Admin app install; tenant is linked via providerId after Handshake Local attach flow. */
export const shopifyInstallations = pgTable(
  "shopify_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shop: varchar("shop", { length: 255 }).notNull().unique(),
    accessTokenEnc: text("access_token_enc"),
    scopes: text("scopes").notNull().default(""),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    pendingAttachTokenHash: text("pending_attach_token_hash"),
    pendingAttachExpiresAt: timestamp("pending_attach_expires_at", { withTimezone: true }),
    uninstalledAt: timestamp("uninstalled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shopify_installations_provider_idx").on(t.providerId)]
);

/** One pricing strategy per provider (currency anchor for tiers and simulation). */
export const pricingProfiles = pgTable(
  "pricing_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .unique()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull().default("Default"),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pricing_profiles_provider_idx").on(t.providerId)]
);

/** Positioning tiers multiply base service list price (template-backed variant). */
export const positioningTiers = pgTable(
  "positioning_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => pricingProfiles.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    multiplier: decimal("multiplier", { precision: 8, scale: 4 }).notNull().default("1.0000"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("positioning_tiers_profile_idx").on(t.profileId)]
);

/**
 * Platform-owned canonical service definitions (steps, add-ons, outcomes + default pricing).
 * Provider offers are `services` rows linked via `canonicalTemplateId` (variants).
 *
 * TODO (roadmap): `category` is a coarse label for discovery; follow-on services / recommendations
 * can key off `slug` + `id` rather than adding parallel category systems here.
 */
export const canonicalServiceTemplates = pgTable(
  "canonical_service_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    version: integer("version").notNull().default(1),
    label: varchar("label", { length: 200 }).notNull(),
    descriptionShort: text("description_short").notNull().default(""),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 120 }).notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    pricingType: pricingTypeEnum("pricing_type").notNull().default("fixed"),
    priceAmount: decimal("price_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    prepInstructions: text("prep_instructions").notNull().default(""),
    steps: jsonb("steps").$type<TemplateStep[]>().notNull(),
    addOns: jsonb("add_ons").$type<TemplateAddOn[]>().notNull(),
    outcomes: jsonb("outcomes").$type<TemplateOutcome[]>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("canonical_templates_active_idx").on(t.isActive)]
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    canonicalTemplateId: uuid("canonical_template_id").references(() => canonicalServiceTemplates.id, {
      onDelete: "set null",
    }),
    /** Version of the canonical row at creation (snapshot for analytics; canonical may bump `version`). */
    canonicalTemplateVersion: integer("canonical_template_version"),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 120 }).notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    pricingType: pricingTypeEnum("pricing_type").notNull().default("fixed"),
    priceAmount: decimal("price_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    prepInstructions: text("prep_instructions").notNull().default(""),
    positioningTierId: uuid("positioning_tier_id").references(() => positioningTiers.id, {
      onDelete: "set null",
    }),
    /** When false, public booking uses a single price (default tier); tier picker is hidden. */
    serviceLevelsEnabled: boolean("service_levels_enabled").notNull().default(true),
    phoneRequired: boolean("phone_required").notNull().default(false),
    notesRequired: boolean("notes_required").notNull().default(false),
    /** Shown on the public booking form when notes are required (provider-defined prompt). */
    notesInstructions: text("notes_instructions"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_provider_id_idx").on(t.providerId)]
);

/** Provider overrides for canonical template add-on suggested prices (per service variant). */
export const serviceAddOnOverrides = pgTable(
  "service_add_on_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    addOnId: varchar("add_on_id", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priceOverride: decimal("price_override", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("service_add_on_overrides_service_add_on_uq").on(t.serviceId, t.addOnId),
    index("service_add_on_overrides_service_idx").on(t.serviceId),
  ]
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTimeLocal: varchar("start_time_local", { length: 8 }).notNull(),
    endTimeLocal: varchar("end_time_local", { length: 8 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("availability_provider_idx").on(t.providerId)]
);

export const blockedTimes = pgTable(
  "blocked_times",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_times_provider_idx").on(t.providerId)]
);

/**
 * Provider-scoped CRM row: durable identity for bookings and provider-facing history.
 * `account_ready`: true for real clients (including never-logged-in public bookers); false for synthetic rows (e.g. walk-in placeholder).
 * `account_claimed_at`: set when a future customer login is linked (optional; not required for readiness).
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    phoneNormalized: varchar("phone_normalized", { length: 40 }),
    notes: text("notes").notNull().default(""),
    /** How this person prefers to be contacted (texts, call windows, language, etc.). */
    communicationNotes: text("communication_notes").notNull().default(""),
    marketingOptOut: boolean("marketing_opt_out").notNull().default(false),
    /**
     * When true, this row is intended as the stable profile for booking history and future customer access.
     * The walk-in placeholder uses false so it stays out of CRM-style lists.
     */
    accountReady: boolean("account_ready").notNull().default(true),
    /** Populated when the customer links a platform login to this record (future flow). */
    accountClaimedAt: timestamp("account_claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("customers_provider_email_uq").on(t.providerId, t.emailNormalized),
  ]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicReference: uuid("public_reference").notNull().unique().defaultRandom(),
    /** Short customer-facing code (e.g. HL-ABC123); optional for legacy rows. */
    confirmationCode: varchar("confirmation_code", { length: 24 }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    /**
     * Denormalized from the service’s template at booking time for reporting and lifecycle analytics.
     * TODO (roadmap): post-appointment “service cards”, upsell/recommendations, and tips can attach here
     * or via new columns while preserving existing booking rows.
     */
    canonicalTemplateId: uuid("canonical_template_id").references(() => canonicalServiceTemplates.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    paymentMethod: varchar("payment_method", { length: 64 }),
    paymentAmount: decimal("payment_amount", { precision: 12, scale: 2 }),
    /** Customer-chosen tip as % of subtotal at booking time (0 = none). */
    tipPercent: decimal("tip_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    /** Snapshot of positioning tier used for public price (Stage 6). */
    positioningTierId: uuid("positioning_tier_id").references(() => positioningTiers.id, {
      onDelete: "set null",
    }),
    /** Canonical template add-on ids selected at booking time. */
    selectedAddOnIds: jsonb("selected_add_on_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    paymentNote: text("payment_note"),
    customerNotes: text("customer_notes").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_provider_starts_idx").on(t.providerId, t.startsAt),
    index("bookings_provider_overlap_idx").on(t.providerId),
    uniqueIndex("bookings_confirmation_code_uidx").on(t.confirmationCode),
  ]
);

/**
 * Provider income derived from bookings (one row per booking when recognized).
 * Lifecycle fields support Option A: first qualifying event creates the row; later events update it.
 */
export const incomeRecords = pgTable(
  "income_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    paymentMethod: incomePaymentMethodEnum("payment_method").notNull().default("other"),
    isCompleted: boolean("is_completed").notNull().default(false),
    isPaid: boolean("is_paid").notNull().default(false),
    /** First time this booking was recognized as earned revenue in the product. */
    recognizedAt: timestamp("recognized_at", { withTimezone: true }),
    /** When payment was actually received (set only when `payment_status` is paid). */
    receivedAt: timestamp("received_at", { withTimezone: true }),
    /** `payment_amount` when amount came from booking; `computed_price` when from pricing engine. */
    sourceAmountType: varchar("source_amount_type", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("income_records_provider_idx").on(t.providerId),
    uniqueIndex("income_records_booking_uidx").on(t.bookingId),
  ]
);

export const expenseRecords = pgTable(
  "expense_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    description: text("description"),
    incurredAt: date("incurred_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("expense_records_provider_incurred_idx").on(t.providerId, t.incurredAt)]
);

export const invoiceRecords = pgTable(
  "invoice_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("invoice_records_provider_idx").on(t.providerId),
    index("invoice_records_booking_idx").on(t.bookingId),
  ]
);

/**
 * Structured post-visit record for a booking (professional service summary).
 * One row per booking in v1; `customer_id` is denormalized for history queries.
 */
export const serviceCards = pgTable(
  "service_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    /** When the service was performed (defaults to booking start; provider may adjust). */
    servicePerformedAt: timestamp("service_performed_at", { withTimezone: true }).notNull(),
    /** Snapshot of the booked service name at save time (reporting / future customer view). */
    serviceNameSnapshot: varchar("service_name_snapshot", { length: 200 }).notNull(),
    /** Canonical template label when the booking used a template-backed service. */
    templateLabelSnapshot: varchar("template_label_snapshot", { length: 200 }),
    workSummary: text("work_summary").notNull().default(""),
    observations: text("observations").notNull().default(""),
    followUpRecommendation: text("follow_up_recommendation").notNull().default(""),
    /** Card-only internal context (distinct from booking internal notes). */
    internalNotes: text("internal_notes").notNull().default(""),
    /** Text safe to show the customer later (portal / email); empty until you write it. */
    customerVisibleSummary: text("customer_visible_summary").notNull().default(""),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("service_cards_booking_uidx").on(t.bookingId),
    index("service_cards_provider_customer_idx").on(t.providerId, t.customerId),
  ]
);

/**
 * Future-facing follow-ups and professional advice, owned by the customer record.
 * Optional links to the visit (booking and/or service card) and to a later booking when fulfilled.
 */
export const customerRecommendations = pgTable(
  "customer_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    sourceBookingId: uuid("source_booking_id").references(() => bookings.id, { onDelete: "set null" }),
    sourceServiceCardId: uuid("source_service_card_id").references(() => serviceCards.id, {
      onDelete: "set null",
    }),
    /** When the client books this recommendation; extension point for automation. */
    fulfillmentBookingId: uuid("fulfillment_booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    reason: text("reason").notNull().default(""),
    suggestedTimeframe: customerRecommendationTimeframeEnum("suggested_timeframe")
      .notNull()
      .default("next_visit"),
    /** Extra nuance for seasonal/custom timing (not a full scheduler). */
    timeframeDetail: text("timeframe_detail").notNull().default(""),
    status: customerRecommendationStatusEnum("status").notNull().default("open"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("customer_recommendations_provider_customer_idx").on(t.providerId, t.customerId),
    index("customer_recommendations_customer_idx").on(t.customerId),
  ]
);

export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  type: varchar("type", { length: 64 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull().default("email"),
  status: varchar("status", { length: 32 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 256 }).unique(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    messageType: varchar("message_type", { length: 64 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("message_templates_provider_idx").on(t.providerId)]
);

/**
 * Append-only domain events for automation, workers, and projections. Distinct from `audit_events`
 * (compliance-oriented). Important state changes should record both when applicable.
 */
export const platformEvents = pgTable(
  "platform_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: varchar("event_name", { length: 128 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 64 }).notNull(),
    aggregateId: varchar("aggregate_id", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    tenantProviderId: uuid("tenant_provider_id").references(() => providers.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorType: platformEventActorEnum("actor_type").notNull().default("system"),
    correlationId: uuid("correlation_id"),
    causationEventId: uuid("causation_event_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("platform_events_tenant_occurred_idx").on(t.tenantProviderId, t.occurredAt),
    index("platform_events_aggregate_idx").on(t.aggregateType, t.aggregateId),
    index("platform_events_name_idx").on(t.eventName),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorType: varchar("actor_type", { length: 32 }).notNull(),
    tenantProviderId: uuid("tenant_provider_id").references(() => providers.id, {
      onDelete: "set null",
    }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }).notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_tenant_idx").on(t.tenantProviderId, t.createdAt)]
);

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 128 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    feature: varchar("feature", { length: 128 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_provider_idx").on(t.providerId)]
);

export const marketingSendLogs = pgTable("marketing_send_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => messageTemplates.id, { onDelete: "set null" }),
  customerIds: jsonb("customer_ids").$type<string[]>().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Lightweight campaign plans for the marketing workspace (no automation engine). */
export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    campaignType: varchar("campaign_type", { length: 64 }).notNull(),
    targetAudience: varchar("target_audience", { length: 64 }).notNull(),
    channel: varchar("channel", { length: 32 }).notNull(),
    sendTiming: varchar("send_timing", { length: 32 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    messageBody: text("message_body").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("marketing_campaigns_provider_idx").on(t.providerId)]
);

/** Saved AI-generated copy for reuse (reconnect, studio, campaigns). */
export const marketingSavedContents = pgTable(
  "marketing_saved_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 32 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    primaryText: text("primary_text").notNull(),
    alternatives: jsonb("alternatives")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    cta: varchar("cta", { length: 200 }),
    imagePrompt: text("image_prompt"),
    channel: varchar("channel", { length: 32 }),
    context: jsonb("context").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("marketing_saved_provider_idx").on(t.providerId)]
);

/** Assistant audit trail (domain events the assistant cares about). */
export const assistantEvents = pgTable(
  "assistant_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    relatedEntityType: varchar("related_entity_type", { length: 64 }),
    relatedEntityId: uuid("related_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("assistant_events_provider_created_idx").on(t.providerId, t.createdAt),
    index("assistant_events_type_idx").on(t.eventType),
  ]
);

/** Deterministic assistant suggestions (rules-first; deduped per provider). */
export const assistantSuggestions = pgTable(
  "assistant_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    /** Stable key for upsert + expiry (e.g. setup:incomplete, unpaid:bookingId). */
    dedupeKey: varchar("dedupe_key", { length: 256 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    priorityScore: integer("priority_score").notNull().default(0),
    urgencyLevel: assistantUrgencyEnum("urgency_level").notNull().default("low"),
    status: assistantSuggestionStatusEnum("status").notNull().default("new"),
    surfaceMode: varchar("surface_mode", { length: 32 }).notNull().default("drawer_card"),
    relatedEntityType: varchar("related_entity_type", { length: 64 }),
    relatedEntityId: uuid("related_entity_id"),
    reasonJson: jsonb("reason_json").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    actionPayloadJson: jsonb("action_payload_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    actedAt: timestamp("acted_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("assistant_suggestions_provider_dedupe_uidx").on(t.providerId, t.dedupeKey),
    index("assistant_suggestions_provider_status_idx").on(t.providerId, t.status),
  ]
);

/** Lightweight log of assistant surfaces (badge/toast) for audit. */
export const assistantNotifications = pgTable(
  "assistant_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    suggestionId: uuid("suggestion_id").references(() => assistantSuggestions.id, {
      onDelete: "cascade",
    }),
    surfaceMode: varchar("surface_mode", { length: 32 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assistant_notifications_provider_idx").on(t.providerId, t.createdAt)]
);

/** Per-provider assistant UI preferences. */
export const assistantPreferences = pgTable(
  "assistant_preferences",
  {
    providerId: uuid("provider_id")
      .primaryKey()
      .references(() => providers.id, { onDelete: "cascade" }),
    /** Suggestion types to suppress (e.g. onboarding, schedule_gap). */
    disabledSuggestionTypes: jsonb("disabled_suggestion_types")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    quietMode: boolean("quiet_mode").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const assistantFeedback = pgTable(
  "assistant_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    suggestionId: uuid("suggestion_id").references(() => assistantSuggestions.id, {
      onDelete: "set null",
    }),
    helpful: boolean("helpful"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assistant_feedback_provider_idx").on(t.providerId, t.createdAt)]
);

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("assistant_conversations_provider_user_uidx").on(t.providerId, t.userId),
    index("assistant_conversations_user_idx").on(t.userId),
  ]
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => assistantConversations.id, { onDelete: "cascade" }),
    role: assistantMessageRoleEnum("role").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assistant_messages_conversation_idx").on(t.conversationId, t.createdAt)]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  provider: one(providers),
  sessions: many(sessions),
  authoredServiceCards: many(serviceCards),
  assistantConversations: many(assistantConversations),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  referralsMade: many(providerReferrals, { relationName: "referrer" }),
  referralReceived: one(providerReferrals, {
    fields: [providers.id],
    references: [providerReferrals.referredProviderId],
    relationName: "referred",
  }),
  services: many(services),
  availabilityRules: many(availabilityRules),
  blockedTimes: many(blockedTimes),
  customers: many(customers),
  bookings: many(bookings),
  serviceCards: many(serviceCards),
  customerRecommendations: many(customerRecommendations),
  shopifyInstallations: many(shopifyInstallations),
  pricingProfile: one(pricingProfiles, { fields: [providers.id], references: [pricingProfiles.providerId] }),
  assistantEvents: many(assistantEvents),
  assistantSuggestions: many(assistantSuggestions),
  assistantNotifications: many(assistantNotifications),
  assistantPreferences: one(assistantPreferences, {
    fields: [providers.id],
    references: [assistantPreferences.providerId],
  }),
  assistantConversations: many(assistantConversations),
  discountCodes: many(providerDiscountCodes),
}));

export const providerReferralsRelations = relations(providerReferrals, ({ one }) => ({
  referrer: one(providers, {
    fields: [providerReferrals.referrerProviderId],
    references: [providers.id],
    relationName: "referrer",
  }),
  referred: one(providers, {
    fields: [providerReferrals.referredProviderId],
    references: [providers.id],
    relationName: "referred",
  }),
}));

export const providerDiscountCodesRelations = relations(providerDiscountCodes, ({ one }) => ({
  provider: one(providers, {
    fields: [providerDiscountCodes.providerId],
    references: [providers.id],
  }),
}));

export const assistantSuggestionsRelations = relations(assistantSuggestions, ({ one, many }) => ({
  provider: one(providers, {
    fields: [assistantSuggestions.providerId],
    references: [providers.id],
  }),
  notifications: many(assistantNotifications),
}));

export const assistantConversationsRelations = relations(assistantConversations, ({ one, many }) => ({
  provider: one(providers, {
    fields: [assistantConversations.providerId],
    references: [providers.id],
  }),
  user: one(users, { fields: [assistantConversations.userId], references: [users.id] }),
  messages: many(assistantMessages),
}));

export const assistantMessagesRelations = relations(assistantMessages, ({ one }) => ({
  conversation: one(assistantConversations, {
    fields: [assistantMessages.conversationId],
    references: [assistantConversations.id],
  }),
}));

export const pricingProfilesRelations = relations(pricingProfiles, ({ one, many }) => ({
  provider: one(providers, { fields: [pricingProfiles.providerId], references: [providers.id] }),
  tiers: many(positioningTiers),
}));

export const positioningTiersRelations = relations(positioningTiers, ({ one, many }) => ({
  profile: one(pricingProfiles, {
    fields: [positioningTiers.profileId],
    references: [pricingProfiles.id],
  }),
  services: many(services),
  bookings: many(bookings),
}));

export const shopifyInstallationsRelations = relations(shopifyInstallations, ({ one }) => ({
  provider: one(providers, {
    fields: [shopifyInstallations.providerId],
    references: [providers.id],
  }),
}));

export const canonicalServiceTemplatesRelations = relations(canonicalServiceTemplates, ({ many }) => ({
  services: many(services),
  bookings: many(bookings),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  provider: one(providers, { fields: [services.providerId], references: [providers.id] }),
  canonicalTemplate: one(canonicalServiceTemplates, {
    fields: [services.canonicalTemplateId],
    references: [canonicalServiceTemplates.id],
  }),
  positioningTier: one(positioningTiers, {
    fields: [services.positioningTierId],
    references: [positioningTiers.id],
  }),
  addOnOverrides: many(serviceAddOnOverrides),
  bookings: many(bookings),
}));

export const serviceAddOnOverridesRelations = relations(serviceAddOnOverrides, ({ one }) => ({
  service: one(services, {
    fields: [serviceAddOnOverrides.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  provider: one(providers, { fields: [bookings.providerId], references: [providers.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  canonicalTemplate: one(canonicalServiceTemplates, {
    fields: [bookings.canonicalTemplateId],
    references: [canonicalServiceTemplates.id],
  }),
  positioningTier: one(positioningTiers, {
    fields: [bookings.positioningTierId],
    references: [positioningTiers.id],
  }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  serviceCard: one(serviceCards, { fields: [bookings.id], references: [serviceCards.bookingId] }),
}));

export const serviceCardsRelations = relations(serviceCards, ({ one }) => ({
  provider: one(providers, { fields: [serviceCards.providerId], references: [providers.id] }),
  booking: one(bookings, { fields: [serviceCards.bookingId], references: [bookings.id] }),
  customer: one(customers, { fields: [serviceCards.customerId], references: [customers.id] }),
  createdByUser: one(users, { fields: [serviceCards.createdByUserId], references: [users.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  provider: one(providers, { fields: [customers.providerId], references: [providers.id] }),
  bookings: many(bookings),
  serviceCards: many(serviceCards),
  recommendations: many(customerRecommendations),
}));

export const customerRecommendationsRelations = relations(customerRecommendations, ({ one }) => ({
  provider: one(providers, {
    fields: [customerRecommendations.providerId],
    references: [providers.id],
  }),
  customer: one(customers, {
    fields: [customerRecommendations.customerId],
    references: [customers.id],
  }),
  sourceBooking: one(bookings, {
    fields: [customerRecommendations.sourceBookingId],
    references: [bookings.id],
  }),
  fulfillmentBooking: one(bookings, {
    fields: [customerRecommendations.fulfillmentBookingId],
    references: [bookings.id],
  }),
  sourceServiceCard: one(serviceCards, {
    fields: [customerRecommendations.sourceServiceCardId],
    references: [serviceCards.id],
  }),
  createdByUser: one(users, {
    fields: [customerRecommendations.createdByUserId],
    references: [users.id],
  }),
}));
