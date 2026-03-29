-- Provider default for "Enable service levels" on newly created services (OFF until they opt in).
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "default_service_levels_enabled" boolean NOT NULL DEFAULT false;

-- Per-service booking and pricing behavior (existing rows: levels ON for backward compatibility).
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "service_levels_enabled" boolean NOT NULL DEFAULT true;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "phone_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notes_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "notes_instructions" text;
