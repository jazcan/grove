"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

export async function createService(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createService" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();
  const name = plainTextFromInput(formData.get("name")?.toString() ?? "", 200);
  if (!name) return { error: "Name is required." };
  const description = plainTextFromInput(formData.get("description")?.toString() ?? "", 5000);
  const category = plainTextFromInput(formData.get("category")?.toString() ?? "", 120);
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  const bufferMinutes = Number(formData.get("bufferMinutes") ?? 0);
  const pricingType = formData.get("pricingType") === "hourly" ? "hourly" : "fixed";
  const priceAmount = formData.get("priceAmount")?.toString() ?? "0";
  const currency = plainTextFromInput(formData.get("currency")?.toString() ?? "CAD", 8) || "CAD";
  const prepInstructions = plainTextFromInput(formData.get("prepInstructions")?.toString() ?? "", 2000);

  const [maxRow] = await db
    .select({ m: services.sortOrder })
    .from(services)
    .where(eq(services.providerId, ctx.providerId))
    .orderBy(desc(services.sortOrder))
    .limit(1);
  const sortOrder = (maxRow?.m ?? 0) + 1;

  const [created] = await db
    .insert(services)
    .values({
      providerId: ctx.providerId,
      name,
      description,
      category,
      durationMinutes: Number.isFinite(durationMinutes) ? Math.max(5, durationMinutes) : 60,
      bufferMinutes: Number.isFinite(bufferMinutes) ? Math.max(0, bufferMinutes) : 0,
      pricingType,
      priceAmount,
      currency,
      prepInstructions,
      isActive: true,
      sortOrder,
    })
    .returning({ id: services.id });

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "service",
    entityId: created!.id,
    action: "created",
  });

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
      isActive: formData.get("isActive") === "on",
      updatedAt: new Date(),
    })
    .where(eq(services.id, id));

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
