"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { tryApplyReferralCodeForExistingProvider } from "@/domain/local-ambassador/referral-lifecycle";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

export async function applyReferralCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "applyReferralCode" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const raw = formData.get("referralCode")?.toString() ?? "";
  const db = getDb();
  const result = await tryApplyReferralCodeForExistingProvider(db, {
    newUserId: ctx.id,
    newProviderId: ctx.providerId,
    rawReferralCode: raw,
  });
  if (result === "invalid") return { error: "That referral code doesn’t match an active provider." };
  if (result === "self") return { error: "You can’t use your own referral code." };
  if (result === "duplicate") return { error: "A referral is already linked to your account." };
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  return { success: "Referral linked. Thanks for helping grow the community." };
}
