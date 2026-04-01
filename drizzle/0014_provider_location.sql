-- Base location fields for marketplace radius search (CA/US). Lat/lng filled via geocoding on profile save when possible.

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "country_code" varchar(2);
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "region" varchar(120);
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "postal_code" varchar(20);
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "latitude" double precision;
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "longitude" double precision;
