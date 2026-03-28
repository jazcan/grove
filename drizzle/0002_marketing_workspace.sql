-- Marketing workspace: lightweight campaigns and saved AI copy.
CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "campaign_type" varchar(64) NOT NULL,
  "target_audience" varchar(64) NOT NULL,
  "channel" varchar(32) NOT NULL,
  "send_timing" varchar(32) NOT NULL,
  "scheduled_at" timestamp with time zone,
  "message_body" text DEFAULT '' NOT NULL,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "marketing_campaigns_provider_idx" ON "marketing_campaigns" ("provider_id");

CREATE TABLE IF NOT EXISTS "marketing_saved_contents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "source" varchar(32) NOT NULL,
  "title" varchar(300) NOT NULL,
  "primary_text" text NOT NULL,
  "alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cta" varchar(200),
  "image_prompt" text,
  "channel" varchar(32),
  "context" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "marketing_saved_provider_idx" ON "marketing_saved_contents" ("provider_id");
