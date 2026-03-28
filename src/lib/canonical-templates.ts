import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { canonicalServiceTemplates } from "@/db/schema";
import type { ServiceFormDefaults, ServiceTemplate } from "@/lib/service-templates";
import { templateStructureSchema } from "@/platform/templates/structure";

function rowToServiceFormDefaults(row: typeof canonicalServiceTemplates.$inferSelect): ServiceFormDefaults {
  return {
    name: row.name,
    description: row.description,
    category: row.category,
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    pricingType: row.pricingType,
    priceAmount: String(row.priceAmount),
    currency: row.currency,
    prepInstructions: row.prepInstructions,
  };
}

export function rowToServiceTemplate(row: typeof canonicalServiceTemplates.$inferSelect): ServiceTemplate {
  return {
    id: row.slug,
    label: row.label,
    descriptionShort: row.descriptionShort,
    service: rowToServiceFormDefaults(row),
  };
}

/** Active canonical templates for dashboard cards (excludes quick-start `simple`; ordered by label). */
export async function listCanonicalTemplatesForUi(): Promise<ServiceTemplate[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(
      and(eq(canonicalServiceTemplates.isActive, true), ne(canonicalServiceTemplates.slug, "simple"))
    )
    .orderBy(asc(canonicalServiceTemplates.label));
  return rows.map(rowToServiceTemplate);
}

/** Defaults for the service form from a canonical slug (`simple`, `consultation-30`, …). */
export async function getServiceDefaultsForCanonicalSlug(
  slug: string | undefined
): Promise<ServiceFormDefaults | null> {
  if (!slug) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(eq(canonicalServiceTemplates.slug, slug))
    .limit(1);
  if (!row || !row.isActive) return null;
  templateStructureSchema.parse({
    steps: row.steps,
    addOns: row.addOns,
    outcomes: row.outcomes,
  });
  return rowToServiceFormDefaults(row);
}

export async function getCanonicalTemplateRowBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(eq(canonicalServiceTemplates.slug, slug))
    .limit(1);
  return row ?? null;
}
