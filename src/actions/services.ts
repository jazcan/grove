"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { providers, services } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { getCanonicalTemplateRowBySlug } from "@/lib/canonical-templates";
import { QUICK_START_PREFILL_ID } from "@/lib/service-templates";
import { emitPlatformEvent } from "@/platform/events/emit";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

const MAX_CREATE_VARIANTS = 6;

function parseCreateVariants(formData: FormData): { durationMinutes: number; bufferMinutes: number; priceAmount: string }[] {
  const out: { durationMinutes: number; bufferMinutes: number; priceAmount: string }[] = [];
  for (let i = 0; i < MAX_CREATE_VARIANTS; i++) {
    const dmRaw = formData.get(`variant_${i}_durationMinutes`);
    if (dmRaw == null || dmRaw === "") break;
    const durationMinutes = Number(dmRaw);
    const bufferMinutes = Number(formData.get(`variant_${i}_bufferMinutes`) ?? 0);
    const priceAmount = formData.get(`variant_${i}_priceAmount`)?.toString() ?? "0";
    if (!Number.isFinite(durationMinutes)) break;
    out.push({
      durationMinutes: Math.max(5, durationMinutes),
      bufferMinutes: Number.isFinite(bufferMinutes) ? Math.max(0, bufferMinutes) : 0,
      priceAmount,
    });
  }
  return out;
}

export async function createService(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createService" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();
  const name = plainTextFromInput(formData.get("name")?.toString() ?? "", 200);
  if (!name) return { error: "Name is required." };
  const description = plainTextFromInput(formData.get("description")?.toString() ?? "", 5000);
  const category = plainTextFromInput(formData.get("category")?.toString() ?? "", 120);
  const variants = parseCreateVariants(formData);
  if (variants.length === 0) {
    return { error: "Add at least one time and price option." };
  }
  const pricingType = formData.get("pricingType") === "hourly" ? "hourly" : "fixed";
  const currency = plainTextFromInput(formData.get("currency")?.toString() ?? "CAD", 8) || "CAD";
  const prepInstructions = plainTextFromInput(formData.get("prepInstructions")?.toString() ?? "", 2000);

  const serviceLevelsEnabled = formData.get("serviceLevelsEnabled") === "on";
  const phoneRequired = formData.get("phoneRequired") === "on";
  const notesRequired = formData.get("notesRequired") === "on";
  const notesInstructions = plainTextFromInput(formData.get("notesInstructions")?.toString() ?? "", 1500);
  if (notesRequired && !notesInstructions.trim()) {
    return { error: 'When "Notes required" is on, add a short note for clients under "What should the customer include?".' };
  }

  const slugRaw = formData.get("canonicalTemplateSlug")?.toString()?.trim() ?? "";
  const templateSlug = slugRaw || QUICK_START_PREFILL_ID;
  const canonical = await getCanonicalTemplateRowBySlug(templateSlug);
  if (!canonical || !canonical.isActive) {
    return { error: "Unknown or inactive service template. Refresh the page and try again." };
  }

  const [maxRow] = await db
    .select({ m: services.sortOrder })
    .from(services)
    .where(eq(services.providerId, ctx.providerId))
    .orderBy(desc(services.sortOrder))
    .limit(1);
  let sortOrder = (maxRow?.m ?? 0) + 1;

  const { tiers } = await ensureDefaultPricingProfile(db, ctx.providerId);
  const defaultTier = tiers.find((t) => t.sortOrder === 0) ?? tiers[0];

  const multi = variants.length > 1;

  for (const v of variants) {
    const rowName = multi ? `${name} (${v.durationMinutes} min)` : name;
    const [created] = await db
      .insert(services)
      .values({
        providerId: ctx.providerId,
        canonicalTemplateId: canonical.id,
        canonicalTemplateVersion: canonical.version,
        positioningTierId: defaultTier?.id ?? null,
        name: rowName,
        description,
        category,
        durationMinutes: v.durationMinutes,
        bufferMinutes: v.bufferMinutes,
        pricingType,
        priceAmount: v.priceAmount,
        currency,
        prepInstructions,
        serviceLevelsEnabled,
        phoneRequired,
        notesRequired,
        notesInstructions: notesRequired ? notesInstructions : null,
        isActive: true,
        sortOrder,
      })
      .returning({ id: services.id });

    const id = created!.id;
    sortOrder += 1;

    await emitPlatformEvent(
      {
        name: "service.created",
        aggregateType: "service",
        aggregateId: id,
        tenantProviderId: ctx.providerId,
        actorUserId: ctx.id,
        actorType: "user",
        payload: {
          serviceId: id,
          providerId: ctx.providerId,
          canonicalTemplateId: canonical.id,
          canonicalTemplateVersion: canonical.version,
        },
      },
      db
    );

    await logAudit({
      actorUserId: ctx.id,
      actorType: "user",
      tenantProviderId: ctx.providerId,
      entityType: "service",
      entityId: id,
      action: "created",
    });
  }

  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/services#existing-services";
  revalidatePath("/dashboard/services");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=service`);
}

export async function updateService(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateService" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const db = getDb();
  const [existing] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.providerId, ctx.providerId)))
    .limit(1);
  if (!existing) return { error: "Not found." };

  const name = plainTextFromInput(formData.get("name")?.toString() ?? "", 200);
  if (!name) return { error: "Name is required." };

  const serviceLevelsEnabled = formData.get("serviceLevelsEnabled") === "on";
  const phoneRequired = formData.get("phoneRequired") === "on";
  const notesRequired = formData.get("notesRequired") === "on";
  const notesInstructions = plainTextFromInput(formData.get("notesInstructions")?.toString() ?? "", 1500);
  if (notesRequired && !notesInstructions.trim()) {
    return { error: 'When "Notes required" is on, add a short note for clients under "What should the customer include?".' };
  }

  await db
    .update(services)
    .set({
      name,
      description: plainTextFromInput(formData.get("description")?.toString() ?? "", 5000),
      category: plainTextFromInput(formData.get("category")?.toString() ?? "", 120),
      durationMinutes: Math.max(5, Number(formData.get("durationMinutes") ?? existing.durationMinutes)),
      bufferMinutes: Math.max(0, Number(formData.get("bufferMinutes") ?? existing.bufferMinutes)),
      pricingType: formData.get("pricingType") === "hourly" ? "hourly" : "fixed",
      priceAmount: formData.get("priceAmount")?.toString() ?? existing.priceAmount,
      currency:
        plainTextFromInput(formData.get("currency")?.toString() ?? existing.currency ?? "CAD", 8) ||
        "CAD",
      prepInstructions: plainTextFromInput(
        formData.get("prepInstructions")?.toString() ?? "",
        2000
      ),
      serviceLevelsEnabled,
      phoneRequired,
      notesRequired,
      notesInstructions: notesRequired ? notesInstructions : null,
      isActive: formData.get("isActive") === "on",
      updatedAt: new Date(),
    })
    .where(eq(services.id, id));

  await db
    .update(providers)
    .set({ defaultServiceLevelsEnabled: serviceLevelsEnabled, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));

  await emitPlatformEvent(
    {
      name: "service.updated",
      aggregateType: "service",
      aggregateId: id,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.id,
      actorType: "user",
      payload: {
        serviceId: id,
        providerId: ctx.providerId,
        patch: { fields: ["core_pricing_and_copy"] },
      },
    },
    db
  );

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "service",
    entityId: id,
    action: "updated",
  });

  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/services#existing-services";
  revalidatePath("/dashboard/services");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=service`);
}

export async function deleteService(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "deleteService" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const db = getDb();
  const res = await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.providerId, ctx.providerId)))
    .returning({ id: services.id });
  if (!res.length) return { error: "Not found." };
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "service",
    entityId: id,
    action: "deleted",
  });
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/services#existing-services";
  revalidatePath("/dashboard/services");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=service`);
}
