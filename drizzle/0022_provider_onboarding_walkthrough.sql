-- Track completion of post-setup checklist (customers + share prompt). Backfill existing live providers.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS onboarding_walkthrough_completed_at timestamptz;

UPDATE providers p
SET onboarding_walkthrough_completed_at = COALESCE(p.updated_at, now())
WHERE p.onboarding_walkthrough_completed_at IS NULL
  AND (
    p.public_profile_enabled = true
    OR EXISTS (SELECT 1 FROM customers c WHERE c.provider_id = p.id LIMIT 1)
  );
