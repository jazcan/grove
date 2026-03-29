"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, users } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { isValidUsername, isReservedUsername } from "@/lib/reserved-usernames";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

export type ProfileState = ActionState;

export async function updateProviderProfile(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "updateProviderProfile" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();

  const [before] = await db
    .select({
      publicProfileEnabled: providers.publicProfileEnabled,
      discoverable: providers.discoverable,
      username: providers.username,
    })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);

  const wantsPublic = formData.get("publicProfileEnabled") === "on";
  const wantsDiscoverable = formData.get("discoverable") === "on";

  const [u] = await db.select().from(users).where(eq(users.id, ctx.id)).limit(1);
  const cutoff = new Date("2026-04-01T00:00:00.000Z");
  const enforceVerified = new Date() >= cutoff;
  if (wantsPublic && enforceVerified && !u?.emailVerifiedAt) {
    return { error: "Verify your email before publishing your profile." };
  }

  const displayName = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200);
  const businessName = plainTextFromInput(formData.get("businessName")?.toString() ?? "", 200);
  const bio = plainTextFromInput(formData.get("bio")?.toString() ?? "", 5000);
  const category = plainTextFromInput(formData.get("category")?.toString() ?? "", 120);
  const city = plainTextFromInput(formData.get("city")?.toString() ?? "", 120);
  const serviceArea = plainTextFromInput(formData.get("serviceArea")?.toString() ?? "", 2000);
  const contactEmail = plainTextFromInput(formData.get("contactEmail")?.toString() ?? "", 320);
  const contactPhone = plainTextFromInput(formData.get("contactPhone")?.toString() ?? "", 40);
  const timezone = plainTextFromInput(formData.get("timezone")?.toString() ?? "", 64) || "America/Toronto";
  const paymentCash = formData.get("paymentCash") === "on";
  const paymentEtransfer = formData.get("paymentEtransfer") === "on";
  const etransferDetails = plainTextFromInput(
    formData.get("etransferDetails")?.toString() ?? "",
    2000
  );
  const paymentDueBefore = formData.get("paymentDueBefore") === "on";
  const cancellationPolicy = plainTextFromInput(
    formData.get("cancellationPolicy")?.toString() ?? "",
    5000
  );
  const reminder24h = formData.get("reminder24h") === "on";
  const reminder2h = formData.get("reminder2h") === "on";
  const lead = Number(formData.get("bookingLeadTimeMinutes") ?? 60);
  const horizon = Number(formData.get("bookingHorizonDays") ?? 60);

  await db
    .update(providers)
    .set({
      displayName: displayName || "Provider",
      businessName: businessName || null,
      bio,
      category,
      city,
      serviceArea,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      timezone,
      paymentCash,
      paymentEtransfer,
      etransferDetails,
      paymentDueBeforeAppointment: paymentDueBefore,
      cancellationPolicy,
      reminder24h,
      reminder2h,
      bookingLeadTimeMinutes: Number.isFinite(lead) ? Math.max(0, lead) : 60,
      bookingHorizonDays: Number.isFinite(horizon) ? Math.max(1, Math.min(365, horizon)) : 60,
      publicProfileEnabled: wantsPublic,
      discoverable: wantsDiscoverable,
      updatedAt: new Date(),
    })
    .where(eq(providers.id, ctx.providerId));

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: "profile_updated",
  });

  if (before?.publicProfileEnabled !== wantsPublic) {
    await logAudit({
      actorUserId: ctx.id,
      actorType: "user",
      tenantProviderId: ctx.providerId,
      entityType: "provider",
      entityId: ctx.providerId,
      action: wantsPublic ? "profile_published" : "profile_unpublished",
    });
  }
  if (before?.discoverable !== wantsDiscoverable) {
    await logAudit({
      actorUserId: ctx.id,
      actorType: "user",
      tenantProviderId: ctx.providerId,
      entityType: "provider",
      entityId: ctx.providerId,
      action: wantsDiscoverable ? "discoverable_on" : "discoverable_off",
    });
  }

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  if (before?.username) {
    revalidatePath(`/${before.username}`);
  }
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/profile";
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=profile`);
}

/**
 * Onboarding only: save username + display name in one step, then redirect to dashboard.
 * Reuses the same validation rules as updateUsername + setDisplayNameOnly.
 */
export async function completeOnboarding(
  _prevState: ProfileState | null,
  formData: FormData
): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "completeOnboarding" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();

  const raw = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  if (!isValidUsername(raw) || isReservedUsername(raw)) {
    return { error: "Username must be 3–64 chars, lowercase letters, numbers, hyphens." };
  }
  const [taken] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.username, raw))
    .limit(1);
  if (taken && taken.id !== ctx.providerId) {
    return { error: "That username is taken." };
  }

  const displayName = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200);
  if (!displayName) return { error: "Display name is required." };

  const [before] = await db
    .select({ username: providers.username })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);

  const lockAt = new Date();
  await db
    .update(providers)
    .set({ username: raw, displayName, usernameLockedAt: lockAt, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: "username_changed",
    metadata: { username: raw },
  });
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: "display_name_set",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/${raw}`);
  if (before?.username && before.username !== raw) {
    revalidatePath(`/${before.username}`);
  }
  redirect("/dashboard");
}

export async function updateUsername(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "updateUsername" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const raw = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  if (!isValidUsername(raw) || isReservedUsername(raw)) {
    return { error: "Username must be 3–64 chars, lowercase letters, numbers, hyphens." };
  }
  const db = getDb();
  const [current] = await db
    .select({ username: providers.username, usernameLockedAt: providers.usernameLockedAt })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);
  if (current?.usernameLockedAt) {
    if (raw !== current.username) {
      return { error: "Your page address is permanent and cannot be changed." };
    }
    revalidatePath("/dashboard/onboarding");
    revalidatePath("/dashboard/profile");
    const returnTo = formData.get("returnTo")?.toString() || "/dashboard/profile#username-form";
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=username`);
  }
  const [taken] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.username, raw))
    .limit(1);
  if (taken && taken.id !== ctx.providerId) {
    return { error: "That username is taken." };
  }
  const [before] = await db
    .select({ username: providers.username })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);
  const lockAt = new Date();
  await db
    .update(providers)
    .set({
      username: raw,
      usernameLockedAt: lockAt,
      updatedAt: new Date(),
    })
    .where(eq(providers.id, ctx.providerId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: "username_changed",
    metadata: { username: raw },
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/${raw}`);
  if (before?.username && before.username !== raw) {
    revalidatePath(`/${before.username}`);
  }
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/profile#username-form";
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=username`);
}

export async function setPublicProfile(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "setPublicProfile" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();
  const [u] = await db.select().from(users).where(eq(users.id, ctx.id)).limit(1);
  const cutoff = new Date("2026-04-01T00:00:00.000Z");
  const enforceVerified = new Date() >= cutoff;
  if (enforceVerified && !u?.emailVerifiedAt) {
    return { error: "Verify your email before publishing your profile." };
  }
  const enabled = formData.get("publicProfileEnabled") === "on";
  await db
    .update(providers)
    .set({ publicProfileEnabled: enabled, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: enabled ? "profile_published" : "profile_unpublished",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/profile#visibility-form";
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=visibility`);
}

export async function setDisplayNameOnly(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "setDisplayNameOnly" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const displayName = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200);
  if (!displayName) return { error: "Display name is required." };
  const db = getDb();
  await db
    .update(providers)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: "display_name_set",
  });
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/onboarding";
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=displayName`);
}

export async function setDiscoverable(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "setDiscoverable" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();
  const v = formData.get("discoverable") === "on";
  await db
    .update(providers)
    .set({ discoverable: v, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: v ? "discoverable_on" : "discoverable_off",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/profile");
  const returnTo = formData.get("returnTo")?.toString() || "/dashboard/profile#discovery-form";
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=discovery`);
}
