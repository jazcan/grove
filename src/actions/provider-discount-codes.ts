"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providerDiscountCodes } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

const MAX_CODES = 5;

export async function addProviderDiscountCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "addProviderDiscountCode" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const raw = plainTextFromInput(formData.get("code")?.toString() ?? "", 32).trim().toUpperCase();
  if (raw.length < 3) return { error: "Enter a code (at least 3 characters)." };
  if (!/^[A-Z0-9_-]+$/.test(raw)) return { error: "Use letters, numbers, dashes, or underscores only." };
  const oneTime = formData.get("oneTimeUse") === "on";
  const pctRaw = formData.get("discountPercent")?.toString()?.trim() ?? "10";
  const pct = Number(pctRaw);
  if (!Number.isFinite(pct) || pct < 1 || pct > 50) {
    return { error: "Discount must be between 1% and 50%." };
  }
  const db = getDb();
  const [cnt] = await db
    .select({ n: count() })
    .from(providerDiscountCodes)
    .where(eq(providerDiscountCodes.providerId, ctx.providerId));
  if (Number(cnt?.n ?? 0) >= MAX_CODES) {
    return { error: `You can add up to ${MAX_CODES} discount codes.` };
  }
  try {
    await db.insert(providerDiscountCodes).values({
      providerId: ctx.providerId,
      code: raw,
      oneTimeUse: oneTime,
      discountPercent: pct.toFixed(2),
    });
  } catch {
    return { error: "That code already exists." };
  }
  revalidatePath("/dashboard/pricing");
  return { success: "Discount code added." };
}

export async function deleteProviderDiscountCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "deleteProviderDiscountCode" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  if (!id) return { error: "Missing code." };
  const db = getDb();
  await db
    .delete(providerDiscountCodes)
    .where(and(eq(providerDiscountCodes.id, id), eq(providerDiscountCodes.providerId, ctx.providerId)));
  revalidatePath("/dashboard/pricing");
  return { success: "Removed." };
}
