CREATE TYPE "public"."income_payment_method" AS ENUM('cash', 'e_transfer', 'terminal', 'other');
--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid');
--> statement-breakpoint
CREATE TABLE "income_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"booking_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'CAD' NOT NULL,
	"payment_method" "income_payment_method" DEFAULT 'other' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"recognized_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"source_amount_type" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "income_records_provider_idx" ON "income_records" USING btree ("provider_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "income_records_booking_uidx" ON "income_records" USING btree ("booking_id");
--> statement-breakpoint
CREATE TABLE "expense_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" varchar(64) NOT NULL,
	"description" text,
	"incurred_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "expense_records_provider_incurred_idx" ON "expense_records" USING btree ("provider_id","incurred_at");
--> statement-breakpoint
CREATE TABLE "invoice_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'CAD' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "invoice_records_provider_idx" ON "invoice_records" USING btree ("provider_id");
--> statement-breakpoint
CREATE INDEX "invoice_records_booking_idx" ON "invoice_records" USING btree ("booking_id");
