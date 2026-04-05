import { describe, expect, it } from "vitest";
import { computeNextAmountOnUpdate, parsePaymentAmount } from "./income-amount-rules";

describe("parsePaymentAmount", () => {
  it("parses decimals", () => {
    expect(parsePaymentAmount("12.5")).toBe("12.50");
    expect(parsePaymentAmount("  100  ")).toBe("100.00");
  });

  it("returns null for empty", () => {
    expect(parsePaymentAmount(null)).toBeNull();
    expect(parsePaymentAmount("")).toBeNull();
  });
});

describe("computeNextAmountOnUpdate (booking → income projection)", () => {
  it("upgrades computed_price to payment_amount when payment is captured", () => {
    const out = computeNextAmountOnUpdate({
      existingAmount: "80.00",
      existingSource: "computed_price",
      bookingPaymentAmount: "95.00",
      resolvedForInsert: { amount: "80.00", sourceAmountType: "computed_price" },
    });
    expect(out).toEqual({ amount: "95.00", sourceAmountType: "payment_amount" });
  });

  it("keeps computed amount when payment still missing", () => {
    const out = computeNextAmountOnUpdate({
      existingAmount: "80.00",
      existingSource: "computed_price",
      bookingPaymentAmount: null,
      resolvedForInsert: { amount: "81.00", sourceAmountType: "computed_price" },
    });
    expect(out.amount).toBe("80.00");
    expect(out.sourceAmountType).toBe("computed_price");
  });

  it("syncs payment_amount from booking when source is payment_amount", () => {
    const out = computeNextAmountOnUpdate({
      existingAmount: "100.00",
      existingSource: "payment_amount",
      bookingPaymentAmount: "102.50",
      resolvedForInsert: null,
    });
    expect(out).toEqual({ amount: "102.50", sourceAmountType: "payment_amount" });
  });
});
