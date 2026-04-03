-- Provider web + social links; booking confirmation codes; discount codes table.

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "social_facebook_url" text;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "social_instagram_url" text;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "social_youtube_url" text;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "social_tiktok_url" text;

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "confirmation_code" varchar(24);

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_confirmation_code_uidx" ON "bookings" ("confirmation_code");

CREATE TABLE IF NOT EXISTS "provider_discount_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "code" varchar(32) NOT NULL,
  "one_time_use" boolean DEFAULT false NOT NULL,
  "redeemed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_discount_codes_provider_code_uidx"
  ON "provider_discount_codes" ("provider_id", "code");

CREATE INDEX IF NOT EXISTS "provider_discount_codes_provider_idx" ON "provider_discount_codes" ("provider_id");
