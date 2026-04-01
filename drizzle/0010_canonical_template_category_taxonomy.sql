-- Normalize canonical service template categories to three top-level buckets:
-- Home Services, Personal Services, Professional Services.
-- Safe to run repeatedly: only touches known legacy values and slug-specific rows.

UPDATE "canonical_service_templates"
SET "category" = 'Home Services'
WHERE "slug" IN ('home-cleaning-2h', 'lawn-care-60');

UPDATE "canonical_service_templates"
SET "category" = 'Personal Services'
WHERE "slug" IN ('dog-walk-45', 'personal-training-50');

UPDATE "canonical_service_templates"
SET "category" = 'Professional Services'
WHERE "slug" IN ('simple', 'consultation-30', 'consultation-60', 'tutoring-60-hourly');

UPDATE "canonical_service_templates"
SET "category" = 'Home Services'
WHERE "category" IN ('Cleaning', 'Lawn Care');

UPDATE "canonical_service_templates"
SET "category" = 'Personal Services'
WHERE "category" IN ('Pet Care', 'Fitness');

UPDATE "canonical_service_templates"
SET "category" = 'Professional Services'
WHERE "category" IN ('General', 'Consultation', 'Tutoring');
