"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import { emitOnboardingCompleted, emitOnboardingSharePromptViewed } from "@/lib/onboarding-platform-events";

export type OnboardingWalkthroughState = { error?: string } | null;

export async function completeOnboardingWalkthroughAction(
  _prev: OnboardingWalkthroughState,
  formData: FormData
): Promise<OnboardingWalkthroughState> {
  if (!(await csrfOk(formData, { action: "completeOnboardingWalkthrough" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const db = getDb();
  await db
    .update(providers)
    .set({ onboardingWalkthroughCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));

  await emitOnboardingCompleted(db, {
    providerId: ctx.providerId,
    userId: ctx.id,
    actorType: "user",
  });

  for (const p of [
    "/dashboard",
    "/dashboard/onboarding",
    "/dashboard/onboarding/customers",
    "/dashboard/onboarding/share",
    "/dashboard/onboarding/first-service",
  ]) {
    revalidatePath(p);
  }
  redirect("/dashboard");
}

export async function recordOnboardingSharePromptViewed(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await csrfOk(formData, { action: "recordOnboardingSharePromptViewed" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const db = getDb();
  await emitOnboardingSharePromptViewed(db, {
    providerId: ctx.providerId,
    userId: ctx.id,
    actorType: "user",
  });
  return { ok: true };
}
