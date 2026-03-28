/**
 * Types and display helpers for service templates. Canonical definitions live in
 * `canonical_service_templates` (see `src/lib/canonical-templates.ts`).
 */
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
  descriptionShort: string;
  service: ServiceFormDefaults;
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
