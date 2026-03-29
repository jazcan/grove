-- Rich context per signal kind (contact info, errors, etc.); merge on each occurrence via app upsert.

ALTER TABLE "provider_dashboard_signals"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE "provider_dashboard_signals"
SET "signal_kind" = 'booking_failed'
WHERE "signal_kind" = 'public_booking_submit_failed';
