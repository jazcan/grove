import { sql } from "drizzle-orm";
import {
  boolean,
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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["provider", "admin"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
  "waived",
  "refunded",
]);

export const pricingTypeEnum = pgEnum("pricing_type", ["fixed", "hourly"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  role: userRoleEnum("role").notNull().default("provider"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
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
    serviceArea: text("service_area").notNull().default(""),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    publicProfileEnabled: boolean("public_profile_enabled").notNull().default(false),
    discoverable: boolean("discoverable").notNull().default(false),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Toronto"),
    paymentCash: boolean("payment_cash").notNull().default(true),
    paymentEtransfer: boolean("payment_etransfer").notNull().default(false),
    etransferDetails: text("etransfer_details").notNull().default(""),
    paymentDueBeforeAppointment: boolean("payment_due_before").notNull().default(false),
    cancellationPolicy: text("cancellation_policy").notNull().default(""),
    reminder24h: boolean("reminder_24h").notNull().default(true),
    reminder2h: boolean("reminder_2h").notNull().default(false),
    profileImageKey: text("profile_image_key"),
    bookingLeadTimeMinutes: integer("booking_lead_time_minutes").notNull().default(60),
    bookingHorizonDays: integer("booking_horizon_days").notNull().default(60),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("providers_discoverable_idx").on(t.discoverable, t.publicProfileEnabled)]
);

/** Shopify Admin app install; tenant is linked via providerId after Grove attach flow. */
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

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 120 }).notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    pricingType: pricingTypeEnum("pricing_type").notNull().default("fixed"),
    priceAmount: decimal("price_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("CAD"),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    prepInstructions: text("prep_instructions").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_provider_id_idx").on(t.providerId)]
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
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    paymentMethod: varchar("payment_method", { length: 64 }),
    paymentAmount: decimal("payment_amount", { precision: 12, scale: 2 }),
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

export const usersRelations = relations(users, ({ one, many }) => ({
  provider: one(providers),
  sessions: many(sessions),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  services: many(services),
  availabilityRules: many(availabilityRules),
  blockedTimes: many(blockedTimes),
  customers: many(customers),
  bookings: many(bookings),
  shopifyInstallations: many(shopifyInstallations),
}));

export const shopifyInstallationsRelations = relations(shopifyInstallations, ({ one }) => ({
  provider: one(providers, {
    fields: [shopifyInstallations.providerId],
    references: [providers.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  provider: one(providers, { fields: [services.providerId], references: [providers.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  provider: one(providers, { fields: [bookings.providerId], references: [providers.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  provider: one(providers, { fields: [customers.providerId], references: [providers.id] }),
  bookings: many(bookings),
}));
