import { describe, expect, it } from "vitest";
import { mapBookingPaymentMethodToIncome } from "./map-payment-method";

describe("mapBookingPaymentMethodToIncome", () => {
  it("maps common labels", () => {
    expect(mapBookingPaymentMethodToIncome("cash")).toBe("cash");
    expect(mapBookingPaymentMethodToIncome("E-Transfer")).toBe("e_transfer");
    expect(mapBookingPaymentMethodToIncome("Interac")).toBe("e_transfer");
    expect(mapBookingPaymentMethodToIncome("card / terminal")).toBe("terminal");
    expect(mapBookingPaymentMethodToIncome("in_person_credit_debit")).toBe("terminal");
  });

  it("defaults to other", () => {
    expect(mapBookingPaymentMethodToIncome(null)).toBe("other");
    expect(mapBookingPaymentMethodToIncome("")).toBe("other");
    expect(mapBookingPaymentMethodToIncome("wire")).toBe("other");
  });
});
