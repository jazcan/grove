ALTER TABLE "provider_discount_codes" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5, 2) DEFAULT 10 NOT NULL;
