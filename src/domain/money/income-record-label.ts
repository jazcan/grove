import type { IncomePaymentMethod } from "@/platform/enums";

export type IncomeRowBadge =
  | "paid"
  | "completed_unpaid"
  | "paid_not_completed"
  | "recognized";

/**
 * Human-readable badge for dashboard income list (amendment 6).
 */
export function incomeRecordBadge(input: {
  isCompleted: boolean;
  isPaid: boolean;
}): { key: IncomeRowBadge; label: string } {
  const { isCompleted, isPaid } = input;
  if (isPaid && isCompleted) {
    return { key: "paid", label: "Paid" };
  }
  if (isPaid && !isCompleted) {
    return { key: "paid_not_completed", label: "Paid, not completed" };
  }
  if (isCompleted && !isPaid) {
    return { key: "completed_unpaid", label: "Completed, unpaid" };
  }
  return { key: "recognized", label: "Recognized" };
}

export function formatIncomePaymentMethod(m: IncomePaymentMethod): string {
  switch (m) {
    case "e_transfer":
      return "E-transfer";
    case "cash":
      return "Cash";
    case "terminal":
      return "Terminal";
    default:
      return "Other";
  }
}
