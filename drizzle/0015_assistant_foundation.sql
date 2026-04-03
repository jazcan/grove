-- Provider assistant: events, suggestions, notifications, preferences, feedback, conversations/messages.

DO $$ BEGIN
  CREATE TYPE "assistant_suggestion_status" AS ENUM (
    'new',
    'seen',
    'acted',
    'dismissed',
    'snoozed',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "assistant_urgency" AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "assistant_message_role" AS ENUM ('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "assistant_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "event_type" varchar(128) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "related_entity_type" varchar(64),
  "related_entity_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_events_provider_created_idx" ON "assistant_events" ("provider_id", "created_at");
CREATE INDEX IF NOT EXISTS "assistant_events_type_idx" ON "assistant_events" ("event_type");

CREATE TABLE IF NOT EXISTS "assistant_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "dedupe_key" varchar(256) NOT NULL,
  "type" varchar(64) NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "priority_score" integer DEFAULT 0 NOT NULL,
  "urgency_level" "assistant_urgency" DEFAULT 'low' NOT NULL,
  "status" "assistant_suggestion_status" DEFAULT 'new' NOT NULL,
  "surface_mode" varchar(32) DEFAULT 'drawer_card' NOT NULL,
  "related_entity_type" varchar(64),
  "related_entity_id" uuid,
  "reason_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "action_payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "snoozed_until" timestamp with time zone,
  "acted_at" timestamp with time zone,
  "dismissed_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "assistant_suggestions_provider_dedupe_uidx"
  ON "assistant_suggestions" ("provider_id", "dedupe_key");
CREATE INDEX IF NOT EXISTS "assistant_suggestions_provider_status_idx"
  ON "assistant_suggestions" ("provider_id", "status");

CREATE TABLE IF NOT EXISTS "assistant_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "suggestion_id" uuid REFERENCES "assistant_suggestions"("id") ON DELETE CASCADE,
  "surface_mode" varchar(32) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_notifications_provider_idx"
  ON "assistant_notifications" ("provider_id", "created_at");

CREATE TABLE IF NOT EXISTS "assistant_preferences" (
  "provider_id" uuid PRIMARY KEY REFERENCES "providers"("id") ON DELETE CASCADE,
  "disabled_suggestion_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "quiet_mode" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "assistant_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "suggestion_id" uuid REFERENCES "assistant_suggestions"("id") ON DELETE SET NULL,
  "helpful" boolean,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_feedback_provider_idx"
  ON "assistant_feedback" ("provider_id", "created_at");

CREATE TABLE IF NOT EXISTS "assistant_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "assistant_conversations_provider_user_uidx"
  ON "assistant_conversations" ("provider_id", "user_id");
CREATE INDEX IF NOT EXISTS "assistant_conversations_user_idx" ON "assistant_conversations" ("user_id");

CREATE TABLE IF NOT EXISTS "assistant_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "assistant_conversations"("id") ON DELETE CASCADE,
  "role" "assistant_message_role" NOT NULL,
  "body" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_messages_conversation_idx"
  ON "assistant_messages" ("conversation_id", "created_at");
