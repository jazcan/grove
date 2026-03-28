-- Stage 6: persist client-facing tier + add-on selection on bookings (with payment_amount).

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "positioning_tier_id" uuid REFERENCES "positioning_tiers"("id") ON DELETE SET NULL;

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "selected_add_on_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS "bookings_positioning_tier_idx" ON "bookings" ("positioning_tier_id");
