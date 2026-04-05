import { describe, expect, it } from "vitest";
import { formatIncomePaymentMethod, incomeRecordBadge } from "./income-record-label";

describe("incomeRecordBadge", () => {
  it("covers the four dashboard labels", () => {
    expect(incomeRecordBadge({ isCompleted: true, isPaid: true }).label).toBe("Paid");
    expect(incomeRecordBadge({ isCompleted: false, isPaid: true }).label).toBe("Paid, not completed");
    expect(incomeRecordBadge({ isCompleted: true, isPaid: false }).label).toBe("Completed, unpaid");
    expect(incomeRecordBadge({ isCompleted: false, isPaid: false }).label).toBe("Recognized");
  });
});

describe("formatIncomePaymentMethod", () => {
  it("labels terminal consistently with booking copy", () => {
    expect(formatIncomePaymentMethod("terminal")).toBe("In person credit/debit");
  });
});
