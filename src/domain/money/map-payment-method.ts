import type { IncomePaymentMethod } from "@/platform/enums";

/**
 * Map free-text booking `payment_method` to income enum.
 * Default `other` when missing or unrecognized.
 */
export function mapBookingPaymentMethodToIncome(raw: string | null | undefined): IncomePaymentMethod {
  const s = raw?.trim().toLowerCase() ?? "";
  if (!s) return "other";
  if (s === "in_person_credit_debit") return "terminal";
  if (s === "cash" || s.includes("cash")) return "cash";
  if (s.includes("e-transfer") || s.includes("etransfer") || s.includes("e transfer") || s === "interac") {
    return "e_transfer";
  }
  if (s.includes("terminal") || s.includes("card") || s.includes("tap") || s.includes("credit") || s.includes("debit")) {
    return "terminal";
  }
  return "other";
}
