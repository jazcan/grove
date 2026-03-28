"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { positioningTiers, pricingProfiles, serviceAddOnOverrides, services } from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { logAudit } from "@/lib/audit";
import { plainTextFromInput } from "@/lib/sanitize";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

export async function updatePricingProfile(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updatePricingProfile" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const name = plainTextFromInput(formData.get("name")?.toString() ?? "", 120) || "Default";
  const currency = plainTextFromInput(formData.get("currency")?.toString() ?? "CAD", 8) || "CAD";
  const db = getDb();
  const { profileId } = await ensureDefaultPricingProfile(db, ctx.providerId);
  await db
    .update(pricingProfiles)
    .set({ name, currency, updatedAt: new Date() })
    .where(eq(pricingProfiles.id, profileId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "pricing_profile",
    entityId: profileId,
    action: "updated",
    metadata: { name, currency },
  });
  revalidatePath("/dashboard/pricing");
  return { success: "Profile saved." };
}

export async function updatePositioningTiers(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updatePositioningTiers" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const count = Number(formData.get("tierCount") ?? 0);
  if (!Number.isFinite(count) || count < 1 || count > 12) return { error: "Invalid tier count." };

  const db = getDb();
  const { profileId } = await ensureDefaultPricingProfile(db, ctx.providerId);

  for (let i = 0; i < count; i++) {
    const id = formData.get(`tierId_${i}`)?.toString() ?? "";
    const label = plainTextFromInput(formData.get(`tierLabel_${i}`)?.toString() ?? "", 120);
    const multRaw = formData.get(`tierMult_${i}`)?.toString() ?? "1";
    const mult = Number(multRaw);
    if (!id || !label || !Number.isFinite(mult) || mult <= 0 || mult > 100) {
      return { error: "Each tier needs a valid label and multiplier (0–100)." };
    }
    const [owns] = await db
      .select({ id: positioningTiers.id })
      .from(positioningTiers)
      .innerJoin(pricingProfiles, eq(positioningTiers.profileId, pricingProfiles.id))
      .where(
        and(eq(positioningTiers.id, id), eq(pricingProfiles.providerId, ctx.providerId))
      )
      .limit(1);
    if (!owns) return { error: "Invalid tier." };
    await db
      .update(positioningTiers)
      .set({
        label,
        multiplier: mult.toFixed(4),
        sortOrder: i,
        updatedAt: new Date(),
      })
      .where(eq(positioningTiers.id, id));
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "pricing_profile",
    entityId: profileId,
    action: "tiers_updated",
  });

  revalidatePath("/dashboard/pricing");
  revalidatePath("/dashboard/services");
  return { success: "Tiers saved." };
}

export async function upsertServiceAddOnOverride(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "upsertServiceAddOnOverride" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const serviceId = formData.get("serviceId")?.toString() ?? "";
  const addOnId = plainTextFromInput(formData.get("addOnId")?.toString() ?? "", 64);
  const enabled = formData.get("enabled") === "on";
  const priceRaw = formData.get("priceOverride")?.toString()?.trim() ?? "";

  if (!serviceId || !addOnId) return { error: "Missing service or add-on." };

  const db = getDb();
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.providerId, ctx.providerId)))
    .limit(1);
  if (!svc) return { error: "Service not found." };

  await db
    .insert(serviceAddOnOverrides)
    .values({
      serviceId,
      addOnId,
      enabled,
      priceOverride: priceRaw.length ? priceRaw : null,
    })
    .onConflictDoUpdate({
      target: [serviceAddOnOverrides.serviceId, serviceAddOnOverrides.addOnId],
      set: {
        enabled,
        priceOverride: priceRaw.length ? priceRaw : null,
        updatedAt: new Date(),
      },
    });

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "service_add_on",
    entityId: `${serviceId}:${addOnId}`,
    action: "override_upserted",
  });

  revalidatePath("/dashboard/pricing");
  return { success: "Add-on saved." };
}
