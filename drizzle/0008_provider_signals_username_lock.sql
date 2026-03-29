-- Provider dashboard signals (e.g. public booking failure) + permanent username lock.

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "username_locked_at" timestamp with time zone;

UPDATE "providers"
SET "username_locked_at" = "created_at"
WHERE "username_locked_at" IS NULL
  AND lower("username") !~ '^prov-[a-f0-9]{12}$';

CREATE TABLE IF NOT EXISTS "provider_dashboard_signals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "signal_kind" varchar(64) NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "occurrence_count" integer DEFAULT 1 NOT NULL,
  "dismissed_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_dashboard_signals_provider_kind_uidx"
  ON "provider_dashboard_signals" ("provider_id", "signal_kind");

CREATE INDEX IF NOT EXISTS "provider_dashboard_signals_provider_idx"
  ON "provider_dashboard_signals" ("provider_id");
