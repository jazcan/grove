-- Lightweight customer "account shell" fields for future login/history without breaking existing rows.
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "account_ready" boolean DEFAULT true NOT NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "account_claimed_at" timestamp with time zone;

-- Synthetic walk-in placeholder (shared across walk-in bookings) is not a personal account record.
UPDATE "customers"
SET "account_ready" = false
WHERE "email_normalized" = 'walk-in@noemail.grove';
