/**
 * Types and display helpers for service templates. Canonical definitions live in
 * `canonical_service_templates` (see `src/lib/canonical-templates.ts`).
 */

/** Platform template taxonomy (`canonical_service_templates.category`) — three top-level buckets only. */
export const SERVICE_TEMPLATE_TOP_LEVEL_CATEGORIES = [
  "Home Services",
  "Personal Services",
  "Professional Services",
] as const;

export type ServiceTemplateTopLevelCategory = (typeof SERVICE_TEMPLATE_TOP_LEVEL_CATEGORIES)[number];

/**
 * Maps legacy seed categories to the current taxonomy so filters work before/without DB migration.
 * Provider-defined `services.category` strings are separate and are not listed here.
 */
const LEGACY_CANONICAL_CATEGORY_TO_TOP_LEVEL: Record<string, ServiceTemplateTopLevelCategory> = {
  Cleaning: "Home Services",
  "Lawn Care": "Home Services",
  "Pet Care": "Personal Services",
  Fitness: "Personal Services",
  Consultation: "Professional Services",
  Tutoring: "Professional Services",
  General: "Professional Services",
};

/** Resolves a canonical template row’s `category` to a top-level bucket for dashboard filtering. */
export function resolveCanonicalTemplateCategoryBucket(
  category: string
): ServiceTemplateTopLevelCategory | null {
  const t = category.trim();
  if ((SERVICE_TEMPLATE_TOP_LEVEL_CATEGORIES as readonly string[]).includes(t)) {
    return t as ServiceTemplateTopLevelCategory;
  }
  return LEGACY_CANONICAL_CATEGORY_TO_TOP_LEVEL[t] ?? null;
}

export type ServiceFormDefaults = {
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  pricingType: "fixed" | "hourly";
  priceAmount: string;
  currency: string;
  prepInstructions: string;
};

export type ServiceTemplate = {
  /** Stable slug matching `canonical_service_templates.slug`. */
  id: string;
  label: string;
  /** One-line outcome-oriented blurb for cards. */
  descriptionShort: string;
  /** Full client-facing description (preview / detail). */
  description: string;
  service: ServiceFormDefaults;
  /** What clients can expect (from canonical template). */
  outcomes: { id: string; label: string }[];
  /** Ordered step titles shown in preview. */
  stepTitles: string[];
};

/** Card title without redundant duration in parentheses (duration appears on the next line). */
export function templateCardTitle(t: ServiceTemplate): string {
  const n = t.service.name;
  const idx = n.lastIndexOf(" (");
  return idx > 0 ? n.slice(0, idx) : n;
}

export const QUICK_START_PREFILL_ID = "simple";

/** One-line duration + price for template cards (e.g. "30 min · $49"). */
export function formatTemplateDurationPrice(s: ServiceFormDefaults): string {
  const cur = (s.currency || "CAD").toUpperCase();
  const sym = cur === "USD" ? "$" : cur === "CAD" ? "$" : `${cur} `;
  const amt = s.priceAmount?.trim() || "0";
  const suffix = s.pricingType === "hourly" ? "/hr" : "";
  return `${s.durationMinutes} min · ${sym}${amt}${suffix}`;
}
