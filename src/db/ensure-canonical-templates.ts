import { count } from "drizzle-orm";
import type { Database } from "@/db";
import {
  CANONICAL_TEMPLATE_SEEDS,
  EXPECTED_CANONICAL_TEMPLATE_COUNT,
} from "@/db/canonical-template-seeds";
import { canonicalServiceTemplates } from "@/db/schema";

/**
 * Self-healing backfill for `canonical_service_templates`.
 *
 * When the row count is below the expected catalog size (e.g. DB was created with
 * `drizzle-kit push`, which does not run numbered SQL files’ `INSERT`s), inserts all seeds.
 * Uses `ON CONFLICT (slug) DO NOTHING` so repeats are safe—no overwrites of existing rows.
 */
export async function ensureCanonicalTemplates(db: Database): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(canonicalServiceTemplates);
  if (Number(n) >= EXPECTED_CANONICAL_TEMPLATE_COUNT) return;

  await db
    .insert(canonicalServiceTemplates)
    .values(
      CANONICAL_TEMPLATE_SEEDS.map((row) => ({
        slug: row.slug,
        version: row.version,
        label: row.label,
        descriptionShort: row.descriptionShort,
        name: row.name,
        description: row.description,
        category: row.category,
        durationMinutes: row.durationMinutes,
        bufferMinutes: row.bufferMinutes,
        pricingType: row.pricingType,
        priceAmount: row.priceAmount,
        currency: row.currency,
        prepInstructions: row.prepInstructions,
        steps: row.steps,
        addOns: row.addOns,
        outcomes: row.outcomes,
        isActive: true,
      }))
    )
    .onConflictDoNothing({ target: canonicalServiceTemplates.slug });
}
