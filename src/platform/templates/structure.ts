import { z } from "zod";

/** Ordered steps shown to clients (what happens during the service). */
export const templateStepSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  order: z.number().int().min(0),
});

export type TemplateStep = z.infer<typeof templateStepSchema>;

/** Optional add-ons; pricing on the variant (`services`) is authoritative for what clients pay today. */
export const templateAddOnSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  suggestedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  pricingType: z.enum(["fixed", "hourly"]).optional(),
});

export type TemplateAddOn = z.infer<typeof templateAddOnSchema>;

/** What the client can expect after the service (clarity / outcomes). */
export const templateOutcomeSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(300),
});

export type TemplateOutcome = z.infer<typeof templateOutcomeSchema>;

export const templateStructureSchema = z.object({
  steps: z.array(templateStepSchema),
  addOns: z.array(templateAddOnSchema),
  outcomes: z.array(templateOutcomeSchema),
});

export type TemplateStructure = z.infer<typeof templateStructureSchema>;
