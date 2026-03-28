-- Add optional communication preference notes (additive; safe on existing DBs).
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "communication_notes" text DEFAULT '' NOT NULL;
