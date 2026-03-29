import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureCanonicalTemplates } from "@/db/ensure-canonical-templates";
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
  const steps = [...row.steps].sort((a, b) => a.order - b.order);
  return {
    id: row.slug,
    label: row.label,
    descriptionShort: row.descriptionShort,
    description: row.description,
    service: rowToServiceFormDefaults(row),
    outcomes: row.outcomes,
    stepTitles: steps.map((s) => s.title),
  };
}

/** Display order for the services hub (beginner-friendly path first, then related pairs, then the rest). */
const TEMPLATE_HUB_ORDER: string[] = [
  "simple",
  "consultation-30",
  "consultation-60",
  "personal-training-50",
  "tutoring-60-hourly",
  "dog-walk-45",
  "lawn-care-60",
  "home-cleaning-2h",
];

function sortTemplatesForHub(templates: ServiceTemplate[]): ServiceTemplate[] {
  return [...templates].sort((a, b) => {
    const ia = TEMPLATE_HUB_ORDER.indexOf(a.id);
    const ib = TEMPLATE_HUB_ORDER.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Active canonical templates for dashboard (template-first path includes quick-start `simple`). */
export async function listCanonicalTemplatesForUi(): Promise<ServiceTemplate[]> {
  const db = getDb();
  await ensureCanonicalTemplates(db);
  const rows = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(eq(canonicalServiceTemplates.isActive, true))
    .orderBy(asc(canonicalServiceTemplates.label));
  return sortTemplatesForHub(rows.map(rowToServiceTemplate));
}

/** Defaults for the service form from a canonical slug (`simple`, `consultation-30`, …). */
export async function getServiceDefaultsForCanonicalSlug(
  slug: string | undefined
): Promise<ServiceFormDefaults | null> {
  if (!slug) return null;
  const db = getDb();
  await ensureCanonicalTemplates(db);
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
  await ensureCanonicalTemplates(db);
  const [row] = await db
    .select()
    .from(canonicalServiceTemplates)
    .where(eq(canonicalServiceTemplates.slug, slug))
    .limit(1);
  return row ?? null;
}
