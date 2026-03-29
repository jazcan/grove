import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import {
  canonicalServiceTemplates,
  positioningTiers,
  pricingProfiles,
  serviceAddOnOverrides,
  services,
} from "@/db/schema";
import { templateStructureSchema } from "@/platform/templates/structure";
import { simulateServicePrice } from "./engine";

export type PublicBookingPriceResult = {
  grandTotal: number;
  currency: string;
  tierId: string;
  selectedAddOnIds: string[];
  simulated: ReturnType<typeof simulateServicePrice>;
};

/**
 * Resolves tier + add-ons and computes the price a public booking should pay.
 * Validates tier belongs to the provider’s pricing profile and add-ons exist on the template / overrides.
 */
export async function computePublicBookingPrice(
  db: Database,
  input: {
    providerId: string;
    serviceId: string;
    /** Client-selected tier id, or null to use the service’s default tier (or first tier). */
    positioningTierId: string | null | undefined;
    selectedAddOnIds: string[];
  }
): Promise<PublicBookingPriceResult | { error: string }> {
  const [profile] = await db
    .select({ id: pricingProfiles.id })
    .from(pricingProfiles)
    .where(eq(pricingProfiles.providerId, input.providerId))
    .limit(1);
  if (!profile) {
    return { error: "Pricing is not configured for this provider." };
  }

  const tierRows = await db
    .select({
      id: positioningTiers.id,
      multiplier: positioningTiers.multiplier,
      sortOrder: positioningTiers.sortOrder,
    })
    .from(positioningTiers)
    .where(eq(positioningTiers.profileId, profile.id));

  if (!tierRows.length) {
    return { error: "No pricing tiers are available." };
  }

  const [svc] = await db
    .select({
      id: services.id,
      priceAmount: services.priceAmount,
      pricingType: services.pricingType,
      currency: services.currency,
      positioningTierId: services.positioningTierId,
      canonicalTemplateId: services.canonicalTemplateId,
      providerId: services.providerId,
      serviceLevelsEnabled: services.serviceLevelsEnabled,
    })
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.providerId, input.providerId)))
    .limit(1);

  if (!svc) {
    return { error: "Service not found." };
  }

  const tierById = new Map(tierRows.map((t) => [t.id, t]));
  const sortedTierIds = tierRows.sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.id);
  const defaultTierIdForService =
    svc.positioningTierId && tierById.has(svc.positioningTierId)
      ? svc.positioningTierId
      : sortedTierIds[0] ?? "";

  let tierId = "";
  if (svc.serviceLevelsEnabled) {
    tierId = input.positioningTierId?.trim() || "";
    if (!tierId || !tierById.has(tierId)) {
      tierId = defaultTierIdForService;
    }
  } else {
    tierId = defaultTierIdForService;
  }

  const tier = tierById.get(tierId);
  if (!tier) {
    return { error: "Invalid pricing tier." };
  }

  const mult = Number(tier.multiplier);
  const tierMultiplier = Number.isFinite(mult) && mult > 0 ? mult : 1;

  let canonicalAddOns: { id: string; label: string; suggestedPrice?: string; pricingType?: "fixed" | "hourly" }[] = [];
  if (svc.canonicalTemplateId) {
    const [tpl] = await db
      .select({
        steps: canonicalServiceTemplates.steps,
        addOns: canonicalServiceTemplates.addOns,
        outcomes: canonicalServiceTemplates.outcomes,
      })
      .from(canonicalServiceTemplates)
      .where(eq(canonicalServiceTemplates.id, svc.canonicalTemplateId))
      .limit(1);
    if (tpl) {
      const parsed = templateStructureSchema.safeParse(tpl);
      if (parsed.success) {
        canonicalAddOns = parsed.data.addOns;
      }
    }
  }

  const addOnIdSet = new Set(canonicalAddOns.map((a) => a.id));
  const overrideRows = await db
    .select()
    .from(serviceAddOnOverrides)
    .where(eq(serviceAddOnOverrides.serviceId, svc.id));
  const disabledAddOnIds = new Set<string>();
  const priceOverrides: Record<string, string | null> = {};
  for (const o of overrideRows) {
    priceOverrides[o.addOnId] = o.priceOverride != null ? String(o.priceOverride) : null;
    if (!o.enabled) disabledAddOnIds.add(o.addOnId);
  }

  const uniqueSelected = [...new Set(input.selectedAddOnIds.map((id) => id.trim()).filter(Boolean))];
  for (const id of uniqueSelected) {
    if (!addOnIdSet.has(id)) {
      return { error: "One or more add-ons are not available for this service." };
    }
    if (disabledAddOnIds.has(id)) {
      return { error: "One or more selected add-ons are not offered for this service." };
    }
  }

  const simulated = simulateServicePrice({
    serviceBaseAmount: String(svc.priceAmount),
    pricingType: svc.pricingType === "hourly" ? "hourly" : "fixed",
    tierMultiplier,
    currency: svc.currency,
    canonicalAddOns,
    selectedAddOnIds: uniqueSelected,
    priceOverrides,
    disabledAddOnIds,
  });

  return {
    grandTotal: simulated.grandTotal,
    currency: simulated.currency,
    tierId,
    selectedAddOnIds: uniqueSelected,
    simulated,
  };
}
