ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "payment_in_person_credit_debit" boolean DEFAULT false NOT NULL;
