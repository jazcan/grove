-- Customer tip % chosen at public booking (0 = no tip).

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "tip_percent" numeric(5, 2) NOT NULL DEFAULT 0;
