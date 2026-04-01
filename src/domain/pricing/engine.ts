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
  /** Service + add-ons (before tip). */
  grandTotal: number;
  currency: string;
};

/** Max tip % allowed on public booking (slider upper bound). */
export const PUBLIC_BOOKING_MAX_TIP_PERCENT = 30;

export type SimulatedPriceWithTip = SimulatedPrice & {
  /** Same as pre-tip `grandTotal` from `simulateServicePrice`. */
  subtotal: number;
  tipPercent: number;
  tipAmount: number;
  /** Subtotal + tip (amount due). */
  grandTotal: number;
};

/**
 * Clamps a client-supplied tip % to [0, PUBLIC_BOOKING_MAX_TIP_PERCENT] with cent precision on the rate.
 */
export function clampPublicBookingTipPercent(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  const capped = Math.min(PUBLIC_BOOKING_MAX_TIP_PERCENT, n);
  return Math.round(capped * 100) / 100;
}

/**
 * Applies a percentage tip on top of a simulated subtotal. If subtotal ≤ 0, tip is forced to 0.
 */
export function applyTipToSimulatedPrice(sim: SimulatedPrice, tipPercent: number): SimulatedPriceWithTip {
  const pct = clampPublicBookingTipPercent(tipPercent);
  const subtotal = sim.grandTotal;
  const tipAmount =
    subtotal <= 0 ? 0 : Math.round(subtotal * (pct / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + tipAmount) * 100) / 100;
  return {
    ...sim,
    subtotal,
    tipPercent: pct,
    tipAmount,
    grandTotal,
  };
}

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
