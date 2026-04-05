DO $$ BEGIN
  CREATE TYPE "provider_referral_status" AS ENUM ('invited', 'signed_up', 'activated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "referral_code" varchar(16);

UPDATE "providers" SET "referral_code" = upper(substr(md5(id::text), 1, 10)) WHERE "referral_code" IS NULL;

ALTER TABLE "providers" ALTER COLUMN "referral_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "providers_referral_code_unique" ON "providers" ("referral_code");

CREATE TABLE IF NOT EXISTS "provider_referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "referrer_provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "referred_provider_id" uuid REFERENCES "providers"("id") ON DELETE CASCADE,
  "referred_email" varchar(320),
  "referral_code_used" varchar(16) NOT NULL,
  "status" "provider_referral_status" NOT NULL DEFAULT 'signed_up',
  "invited_at" timestamp with time zone,
  "signed_up_at" timestamp with time zone,
  "activated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_referrals_referred_uidx" ON "provider_referrals" ("referred_provider_id");
CREATE INDEX IF NOT EXISTS "provider_referrals_referrer_idx" ON "provider_referrals" ("referrer_provider_id");
