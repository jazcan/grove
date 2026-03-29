-- Temporary pause for new public bookings (provider-controlled).

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "bookings_paused" boolean NOT NULL DEFAULT false;
