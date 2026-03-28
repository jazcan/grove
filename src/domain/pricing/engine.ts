import type { TemplateAddOn } from "@/platform/templates/structure";

export type PriceLineItem = {
  kind: "base" | "add_on";
  label: string;
  amount: number;
};

export type SimulatedPrice = {
  basePrice: number;
  tierMultiplier: number;
  adjustedBase: number;
  lineItems: PriceLineItem[];
  addOnsTotal: number;
  grandTotal: number;
  currency: string;
};

function parseMoney(s: string | null | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Recommended list price from template default × tier (before add-ons).
 */
export function recommendListPrice(params: {
  templateBasePrice: string;
  tierMultiplier: number;
}): number {
  const base = parseMoney(params.templateBasePrice);
  return Math.round(base * params.tierMultiplier * 100) / 100;
}

/**
 * Basic simulation: base (from service) × tier + selected add-ons (canonical + overrides).
 */
export function simulateServicePrice(input: {
  serviceBaseAmount: string;
  pricingType: "fixed" | "hourly";
  tierMultiplier: number;
  currency: string;
  canonicalAddOns: TemplateAddOn[];
  selectedAddOnIds: string[];
  /** addOnId → override price string or null to use canonical suggested */
  priceOverrides: Record<string, string | null>;
  disabledAddOnIds: Set<string>;
}): SimulatedPrice {
  const baseRaw = parseMoney(input.serviceBaseAmount);
  const mult = input.tierMultiplier > 0 ? input.tierMultiplier : 1;
  const adjustedBase =
    input.pricingType === "hourly"
      ? Math.round(baseRaw * mult * 100) / 100
      : Math.round(baseRaw * mult * 100) / 100;

  const lineItems: PriceLineItem[] = [
    {
      kind: "base",
      label: input.pricingType === "hourly" ? `Hourly rate × ${mult.toFixed(2)}` : `Service × ${mult.toFixed(2)}`,
      amount: adjustedBase,
    },
  ];

  let addOnsTotal = 0;
  const byId = new Map(input.canonicalAddOns.map((a) => [a.id, a]));
  for (const id of input.selectedAddOnIds) {
    if (input.disabledAddOnIds.has(id)) continue;
    const add = byId.get(id);
    if (!add) continue;
    const override = input.priceOverrides[id];
    const raw =
      override != null && override !== ""
        ? parseMoney(override)
        : add.suggestedPrice != null
          ? parseMoney(add.suggestedPrice)
          : 0;
    const amt = Math.round(raw * 100) / 100;
    addOnsTotal += amt;
    lineItems.push({
      kind: "add_on",
      label: add.label,
      amount: amt,
    });
  }

  const grandTotal = Math.round((adjustedBase + addOnsTotal) * 100) / 100;

  return {
    basePrice: baseRaw,
    tierMultiplier: mult,
    adjustedBase,
    lineItems,
    addOnsTotal,
    grandTotal,
    currency: input.currency || "CAD",
  };
}
