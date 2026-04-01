import { describe, expect, it } from "vitest";
import {
  applyTipToSimulatedPrice,
  clampPublicBookingTipPercent,
  PUBLIC_BOOKING_MAX_TIP_PERCENT,
  simulateServicePrice,
} from "./engine";

describe("clampPublicBookingTipPercent", () => {
  it("clamps negatives to 0", () => {
    expect(clampPublicBookingTipPercent(-1)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clampPublicBookingTipPercent(PUBLIC_BOOKING_MAX_TIP_PERCENT + 5)).toBe(
      PUBLIC_BOOKING_MAX_TIP_PERCENT
    );
  });

  it("rounds to cents on the percent value", () => {
    expect(clampPublicBookingTipPercent(12.345)).toBe(12.35);
  });
});

describe("applyTipToSimulatedPrice", () => {
  const baseSim = simulateServicePrice({
    serviceBaseAmount: "100",
    pricingType: "fixed",
    tierMultiplier: 1,
    currency: "CAD",
    canonicalAddOns: [],
    selectedAddOnIds: [],
    priceOverrides: {},
    disabledAddOnIds: new Set(),
  });

  it("computes tip on subtotal and total", () => {
    const withTip = applyTipToSimulatedPrice(baseSim, 15);
    expect(withTip.subtotal).toBe(100);
    expect(withTip.tipPercent).toBe(15);
    expect(withTip.tipAmount).toBe(15);
    expect(withTip.grandTotal).toBe(115);
  });

  it("allows zero tip", () => {
    const withTip = applyTipToSimulatedPrice(baseSim, 0);
    expect(withTip.tipAmount).toBe(0);
    expect(withTip.grandTotal).toBe(100);
  });

  it("forces zero tip when subtotal is zero", () => {
    const zero = simulateServicePrice({
      serviceBaseAmount: "0",
      pricingType: "fixed",
      tierMultiplier: 1,
      currency: "CAD",
      canonicalAddOns: [],
      selectedAddOnIds: [],
      priceOverrides: {},
      disabledAddOnIds: new Set(),
    });
    const withTip = applyTipToSimulatedPrice(zero, 20);
    expect(withTip.tipAmount).toBe(0);
    expect(withTip.grandTotal).toBe(0);
  });
});
