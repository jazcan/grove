-- Stage 2: canonical service templates + provider variant links + booking denormalization.

CREATE TABLE IF NOT EXISTS "canonical_service_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL UNIQUE,
  "version" integer DEFAULT 1 NOT NULL,
  "label" varchar(200) NOT NULL,
  "description_short" text DEFAULT '' NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "category" varchar(120) DEFAULT '' NOT NULL,
  "duration_minutes" integer NOT NULL,
  "buffer_minutes" integer DEFAULT 0 NOT NULL,
  "pricing_type" pricing_type DEFAULT 'fixed' NOT NULL,
  "price_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "currency" varchar(8) DEFAULT 'CAD' NOT NULL,
  "prep_instructions" text DEFAULT '' NOT NULL,
  "steps" jsonb NOT NULL,
  "add_ons" jsonb NOT NULL,
  "outcomes" jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "canonical_templates_active_idx" ON "canonical_service_templates" ("is_active");

INSERT INTO "canonical_service_templates" (
  "slug", "version", "label", "description_short", "name", "description", "category",
  "duration_minutes", "buffer_minutes", "pricing_type", "price_amount", "currency", "prep_instructions",
  "steps", "add_ons", "outcomes"
) VALUES
(
  'simple',
  1,
  'Quick start',
  'Minimal structure—fill in what you offer.',
  'My service',
  'Book online at a time that works for you. You can rename this and adjust the details anytime.',
  'General',
  60,
  10,
  'fixed',
  '50.00',
  'CAD',
  '',
  '[{"id":"define","title":"Define your offer","description":"Set name, duration, and pricing shown when clients book.","order":0}]'::jsonb,
  '[]'::jsonb,
  '[{"id":"live","label":"Clients can book when your profile is published"}]'::jsonb
),
(
  'consultation-30',
  1,
  'Initial Consultation (30 min)',
  'A focused session to understand your needs and next steps.',
  'Initial Consultation (30 min)',
  'A focused 30-minute consultation to understand your goals, answer questions, and recommend next steps. Includes a short follow-up summary with actionable recommendations.',
  'Consultation',
  30,
  10,
  'fixed',
  '49.00',
  'CAD',
  'Before we meet, please share a brief summary of what you’d like help with and any relevant links/photos/documents. If this is location-based, include your address and preferred contact number.',
  '[{"id":"intake","title":"Understand goals","order":0},{"id":"recommend","title":"Recommendations & next steps","order":1}]'::jsonb,
  '[{"id":"extra-15","label":"Extra 15 minutes","description":"Extend the session","suggestedPrice":"25.00","pricingType":"fixed"}]'::jsonb,
  '[{"id":"summary","label":"Short follow-up summary with actionable recommendations"}]'::jsonb
),
(
  'home-cleaning-2h',
  1,
  'Home Cleaning (2 hours)',
  'Kitchens, bathrooms, and living areas—surfaces, floors, and a general tidy.',
  'Home Cleaning (2 hours)',
  'Standard home cleaning for kitchens, bathrooms, and living areas. Includes surfaces, floors, and general tidying. You can add notes for priority areas when you book.',
  'Cleaning',
  120,
  15,
  'fixed',
  '160.00',
  'CAD',
  'Please secure pets and place any fragile items aside. If you have product preferences (eco-friendly, scent-free, etc.), add them in your notes. Provide building entry details if needed.',
  '[{"id":"prep","title":"Access & priorities","order":0},{"id":"clean","title":"Clean priority areas","order":1},{"id":"finish","title":"Tidy & wrap up","order":2}]'::jsonb,
  '[{"id":"deep-fridge","label":"Deep clean fridge","suggestedPrice":"45.00","pricingType":"fixed"}]'::jsonb,
  '[{"id":"tidy","label":"Living areas and surfaces refreshed"},{"id":"floors","label":"Floors vacuumed/mopped as appropriate"}]'::jsonb
),
(
  'lawn-care-60',
  1,
  'Lawn Mowing + Edging (60 min)',
  'Mowing and edging for front and back—clippings tidied from walks and drives.',
  'Lawn Mowing + Edging (60 min)',
  'Front and back lawn mowing with clean edging along walkways/driveway. Includes quick tidy-up of clippings on hard surfaces.',
  'Lawn Care',
  60,
  10,
  'fixed',
  '75.00',
  'CAD',
  'Please ensure access to the yard and remove toys/hoses/obstacles from the grass. Let me know if there are gates, pets, or any areas to avoid (sprinklers, new sod, etc.).',
  '[{"id":"mow","title":"Mow front and back","order":0},{"id":"edge","title":"Edge walks and driveway","order":1},{"id":"sweep","title":"Clear clippings from hard surfaces","order":2}]'::jsonb,
  '[{"id":"bag-clippings","label":"Bag clippings","suggestedPrice":"15.00","pricingType":"fixed"}]'::jsonb,
  '[{"id":"neat","label":"Neat, even cut along edges"}]'::jsonb
),
(
  'dog-walk-45',
  1,
  'Dog Walk (45 min)',
  'A paced walk, water refill, and a short update when you’re back.',
  'Dog Walk (45 min)',
  'A 45-minute walk tailored to your dog’s pace and preferences. Includes fresh water refill and a short update after the walk.',
  'Pet Care',
  45,
  5,
  'fixed',
  '35.00',
  'CAD',
  'Please provide leash/harness, any special instructions (reactivity, allergies, route preferences), and building access details. If treats are allowed, leave a small container out.',
  '[{"id":"walk","title":"Leashed walk at your dog’s pace","order":0},{"id":"water","title":"Water refill","order":1},{"id":"update","title":"Brief update after the walk","order":2}]'::jsonb,
  '[]'::jsonb,
  '[{"id":"exercise","label":"Exercise and stimulation during the walk"}]'::jsonb
),
(
  'tutoring-60-hourly',
  1,
  'Tutoring Session (60 min, hourly)',
  'Focused 1:1 time on the topics you choose, with clear next steps.',
  'Tutoring Session (60 min)',
  'One hour of 1:1 tutoring focused on your specific goals. We’ll review concepts, practice problems, and leave you with next steps to keep improving.',
  'Tutoring',
  60,
  10,
  'hourly',
  '60.00',
  'CAD',
  'Please share the topic(s), grade/course, and any recent assignments or areas you’re stuck on. If you have a textbook or worksheet, upload photos or links ahead of time.',
  '[{"id":"review","title":"Review concepts & gaps","order":0},{"id":"practice","title":"Guided practice","order":1},{"id":"next","title":"Clear next steps","order":2}]'::jsonb,
  '[{"id":"extra-30","label":"Extra 30 minutes","suggestedPrice":"30.00","pricingType":"fixed"}]'::jsonb,
  '[{"id":"progress","label":"Actionable next steps for independent practice"}]'::jsonb
)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "canonical_template_id" uuid REFERENCES "canonical_service_templates"("id") ON DELETE SET NULL;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "canonical_template_version" integer;

CREATE INDEX IF NOT EXISTS "services_canonical_template_id_idx" ON "services" ("canonical_template_id");

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "canonical_template_id" uuid REFERENCES "canonical_service_templates"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "bookings_canonical_template_id_idx" ON "bookings" ("canonical_template_id");
