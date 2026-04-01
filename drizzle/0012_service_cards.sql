-- Structured post-visit service records (one per booking in v1).
CREATE TABLE IF NOT EXISTS "service_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "service_performed_at" timestamp with time zone NOT NULL,
  "service_name_snapshot" varchar(200) NOT NULL,
  "template_label_snapshot" varchar(200),
  "work_summary" text DEFAULT '' NOT NULL,
  "observations" text DEFAULT '' NOT NULL,
  "follow_up_recommendation" text DEFAULT '' NOT NULL,
  "internal_notes" text DEFAULT '' NOT NULL,
  "customer_visible_summary" text DEFAULT '' NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_cards_booking_uidx" ON "service_cards" ("booking_id");
CREATE INDEX IF NOT EXISTS "service_cards_provider_customer_idx" ON "service_cards" ("provider_id", "customer_id");
