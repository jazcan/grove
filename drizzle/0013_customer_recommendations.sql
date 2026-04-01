-- Customer-level follow-on recommendations (optional links to booking / service card / future fulfillment).

CREATE TYPE "customer_recommendation_status" AS ENUM ('open', 'booked', 'completed', 'declined', 'archived');

CREATE TYPE "customer_recommendation_timeframe" AS ENUM (
  'asap',
  'within_30_days',
  'next_visit',
  'seasonal',
  'custom'
);

CREATE TABLE "customer_recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "providers" ("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers" ("id") ON DELETE CASCADE,
  "source_booking_id" uuid REFERENCES "bookings" ("id") ON DELETE SET NULL,
  "source_service_card_id" uuid REFERENCES "service_cards" ("id") ON DELETE SET NULL,
  "fulfillment_booking_id" uuid REFERENCES "bookings" ("id") ON DELETE SET NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "reason" text NOT NULL DEFAULT '',
  "suggested_timeframe" "customer_recommendation_timeframe" NOT NULL DEFAULT 'next_visit',
  "timeframe_detail" text NOT NULL DEFAULT '',
  "status" "customer_recommendation_status" NOT NULL DEFAULT 'open',
  "created_by_user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "customer_recommendations_provider_customer_idx" ON "customer_recommendations" ("provider_id", "customer_id");
CREATE INDEX "customer_recommendations_customer_idx" ON "customer_recommendations" ("customer_id");
