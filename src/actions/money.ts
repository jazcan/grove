"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { expenseRecords } from "@/db/schema";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/platform/enums";
import { plainTextFromInput } from "@/lib/sanitize";

function isExpenseCategory(s: string): s is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(s);
}

export async function addExpenseRecord(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "addExpenseRecord" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const amountRaw = formData.get("amount")?.toString() ?? "";
  const categoryRaw = formData.get("category")?.toString() ?? "";
  const description = plainTextFromInput(formData.get("description")?.toString() ?? "", 2000);
  const incurredAtRaw = formData.get("incurredAt")?.toString() ?? "";

  const n = Number(amountRaw);
  if (!Number.isFinite(n) || n <= 0) {
    return { error: "Enter a valid amount." };
  }
  if (!isExpenseCategory(categoryRaw)) {
    return { error: "Pick a category." };
  }
  const parts = incurredAtRaw.split("-").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x))) {
    return { error: "Pick a valid date." };
  }
  const [y, mo, d] = parts;
  const incurredAt = new Date(y, mo - 1, d);
  if (Number.isNaN(incurredAt.getTime())) {
    return { error: "Pick a valid date." };
  }

  const db = getDb();
  await db.insert(expenseRecords).values({
    providerId: ctx.providerId,
    amount: n.toFixed(2),
    category: categoryRaw,
    description: description || null,
    incurredAt,
    updatedAt: new Date(),
  });

  revalidatePath("/dashboard/money");
  return { success: "Expense saved." };
}
