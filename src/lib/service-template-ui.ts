import type { ServiceTemplate } from "@/lib/service-templates";

/** Marketing / guidance labels for template cards (not stored in DB). */
export type ServiceTemplateUiTag =
  | "most-popular"
  | "best-for-beginners"
  | "fast-setup"
  | "high-demand";

const TAG_LABELS: Record<ServiceTemplateUiTag, string> = {
  "most-popular": "Most popular",
  "best-for-beginners": "Best for beginners",
  "fast-setup": "Fast setup",
  "high-demand": "High demand",
};

export type ServiceTemplateUiMeta = {
  tags: ServiceTemplateUiTag[];
};

/** Curated tags by canonical slug — keeps catalog data separate from positioning copy. */
export const SERVICE_TEMPLATE_UI: Record<string, ServiceTemplateUiMeta> = {
  simple: { tags: ["best-for-beginners", "fast-setup"] },
  "consultation-30": { tags: ["most-popular", "high-demand"] },
  "consultation-60": { tags: ["high-demand"] },
  "home-cleaning-2h": { tags: ["high-demand"] },
  "lawn-care-60": { tags: ["fast-setup"] },
  "dog-walk-45": { tags: ["fast-setup"] },
  "tutoring-60-hourly": { tags: ["most-popular"] },
  "personal-training-50": { tags: ["high-demand"] },
};

export function templateUiTags(slug: string): ServiceTemplateUiTag[] {
  return SERVICE_TEMPLATE_UI[slug]?.tags ?? [];
}

export function formatTemplateTagLabel(tag: ServiceTemplateUiTag): string {
  return TAG_LABELS[tag];
}

/** Featured in the Smart Templates strip (order preserved). */
export const SMART_TEMPLATE_SLUGS = ["consultation-30", "simple"] as const;

export function partitionSmartAndRest(templates: ServiceTemplate[]): {
  smart: ServiceTemplate[];
  rest: ServiceTemplate[];
} {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const smart = SMART_TEMPLATE_SLUGS.map((slug) => byId.get(slug)).filter(
    (t): t is ServiceTemplate => t != null
  );
  const smartSet = new Set<string>(SMART_TEMPLATE_SLUGS);
  const rest = templates.filter((t) => !smartSet.has(t.id));
  return { smart, rest };
}
