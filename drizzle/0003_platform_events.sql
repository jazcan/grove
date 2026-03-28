-- Stage 1: append-only domain events + actor enum for automation/workers.
DO $$ BEGIN
  CREATE TYPE "platform_event_actor" AS ENUM ('user', 'system', 'customer', 'automation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "platform_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" varchar(128) NOT NULL,
  "aggregate_type" varchar(64) NOT NULL,
  "aggregate_id" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "tenant_provider_id" uuid REFERENCES "providers"("id") ON DELETE SET NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_type" "platform_event_actor" DEFAULT 'system' NOT NULL,
  "correlation_id" uuid,
  "causation_event_id" uuid,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "platform_events_tenant_occurred_idx" ON "platform_events" ("tenant_provider_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "platform_events_aggregate_idx" ON "platform_events" ("aggregate_type", "aggregate_id");
CREATE INDEX IF NOT EXISTS "platform_events_name_idx" ON "platform_events" ("event_name");

DO $$ BEGIN
  ALTER TABLE "platform_events"
    ADD CONSTRAINT "platform_events_causation_event_id_platform_events_id_fk"
    FOREIGN KEY ("causation_event_id") REFERENCES "platform_events"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
