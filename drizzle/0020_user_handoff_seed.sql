DO $$ BEGIN
  CREATE TYPE "handoff_status" AS ENUM ('none', 'seeded', 'invited', 'claimed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_seeded_account" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "handoff_status" "handoff_status" DEFAULT 'none' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "handoff_to_email" varchar(320);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "handoff_sent_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "claimed_at" timestamp with time zone;

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "internal_admin_notes" text;
