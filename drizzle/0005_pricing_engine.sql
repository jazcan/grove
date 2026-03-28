-- Stage 5: pricing profiles, positioning tiers, service tier link, add-on overrides (template-backed).

CREATE TABLE IF NOT EXISTS "pricing_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL UNIQUE REFERENCES "providers"("id") ON DELETE CASCADE,
  "name" varchar(120) DEFAULT 'Default' NOT NULL,
  "currency" varchar(8) DEFAULT 'CAD' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pricing_profiles_provider_idx" ON "pricing_profiles" ("provider_id");

CREATE TABLE IF NOT EXISTS "positioning_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "pricing_profiles"("id") ON DELETE CASCADE,
  "label" varchar(120) NOT NULL,
  "multiplier" numeric(8, 4) DEFAULT 1.0 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "positioning_tiers_profile_idx" ON "positioning_tiers" ("profile_id");

CREATE TABLE IF NOT EXISTS "service_add_on_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "add_on_id" varchar(64) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "price_override" numeric(12, 2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_add_on_overrides_service_add_on_uq" UNIQUE ("service_id", "add_on_id")
);

CREATE INDEX IF NOT EXISTS "service_add_on_overrides_service_idx" ON "service_add_on_overrides" ("service_id");

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "positioning_tier_id" uuid REFERENCES "positioning_tiers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "services_positioning_tier_idx" ON "services" ("positioning_tier_id");
