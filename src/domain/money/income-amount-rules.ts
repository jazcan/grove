import type { IncomeSourceAmountType } from "@/platform/enums";

export function parsePaymentAmount(val: string | null | undefined): string | null {
  if (val == null) return null;
  const t = String(val).trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

/** Amount update rules when syncing an existing income row (computed → payment upgrade, etc.). */
export function computeNextAmountOnUpdate(input: {
  existingAmount: string;
  existingSource: IncomeSourceAmountType | null;
  bookingPaymentAmount: string | null;
  resolvedForInsert: { amount: string; sourceAmountType: IncomeSourceAmountType } | null;
}): { amount: string; sourceAmountType: IncomeSourceAmountType } {
  const pay = parsePaymentAmount(input.bookingPaymentAmount);
  const prev = input.existingSource;

  if (!prev) {
    if (pay != null) return { amount: pay, sourceAmountType: "payment_amount" };
    if (input.resolvedForInsert) return input.resolvedForInsert;
    return { amount: input.existingAmount, sourceAmountType: "computed_price" };
  }

  if (prev === "computed_price" && pay != null) {
    return { amount: pay, sourceAmountType: "payment_amount" };
  }
  if (prev === "payment_amount" && pay != null) {
    return { amount: pay, sourceAmountType: "payment_amount" };
  }
  if (prev === "computed_price" && pay == null) {
    return { amount: input.existingAmount, sourceAmountType: "computed_price" };
  }
  if (prev === "payment_amount" && pay == null) {
    return { amount: input.existingAmount, sourceAmountType: "payment_amount" };
  }

  if (input.resolvedForInsert) {
    return input.resolvedForInsert;
  }
  return { amount: input.existingAmount, sourceAmountType: prev ?? "computed_price" };
}
