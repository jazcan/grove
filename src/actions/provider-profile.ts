"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, users } from "@/db/schema";
import { optionalHttpUrl, plainTextFromInput } from "@/lib/sanitize";
import { isValidUsername, isReservedUsername } from "@/lib/reserved-usernames";
import { logAudit } from "@/lib/audit";
import { geocodeProviderAddress } from "@/lib/geocoding/geocode-provider-address";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import { maybeActivateReferralForProvider } from "@/domain/local-ambassador/referral-lifecycle";
import { emitOnboardingIdentityCompleted } from "@/lib/onboarding-platform-events";
import type { ActionState } from "@/domain/auth/actions";
import {
  buildOnboardingUsernameCandidates,
  isDisplayNameTakenByOtherProvider,
  pickFirstAvailableUsername,
} from "@/lib/provider-onboarding-identity";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

/** Set to `true` to require verified account email before publishing (see profile forms). */
const ENFORCE_VERIFIED_EMAIL_FOR_PUBLISH = false;

export type ProfileState = ActionState;

export type PreviewOnboardingIdentityResult =
  | {
      ok: true;
      normalized: string;
      displayNameAvailable: boolean;
      suggestedUsername: string | null;
      alternates: string[];
    }
  | { ok: false; error: string };

/**
 * Debounced onboarding UI: checks display-name uniqueness and proposes an available username
 * derived from the display name (plus safe fallbacks).
 */
export async function previewOnboardingIdentity(formData: FormData): Promise<PreviewOnboardingIdentityResult> {
  if (!(await csrfOk(formData, { action: "previewOnboardingIdentity" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, `onb-idn-${ctx.providerId}`), 60, 60_000);
  if (!rl.ok) {
    return { ok: false, error: `Too many checks. Try again in ${rl.retryAfterSec}s.` };
  }

  const db = getDb();
  const normalized = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200);
  if (!normalized) {
    return {
      ok: true,
      normalized: "",
      displayNameAvailable: false,
      suggestedUsername: null,
      alternates: [],
    };
  }

  const taken = await isDisplayNameTakenByOtherProvider(db, ctx.providerId, normalized);
  if (taken) {
    return {
      ok: true,
      normalized,
      displayNameAvailable: false,
      suggestedUsername: null,
      alternates: [],
    };
  }

  const candidates = buildOnboardingUsernameCandidates(normalized, { providerId: ctx.providerId });
  const picked = await pickFirstAvailableUsername(db, ctx.providerId, candidates);
  if (!picked) {
    return { ok: false, error: "Could not reserve a username. Try again in a moment." };
  }
  const suggestion = picked.username;

  const alternates: string[] = [];
  for (const c of candidates) {
    if (c === suggestion) continue;
    const p = await pickFirstAvailableUsername(db, ctx.providerId, [c]);
    if (p?.username === c) {
      alternates.push(c);
      if (alternates.length >= 3) break;
    }
  }

  return {
    ok: true,
    normalized,
    displayNameAvailable: true,
    suggestedUsername: suggestion,
    alternates,
  };
}

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

  if (wantsPublic && ENFORCE_VERIFIED_EMAIL_FOR_PUBLISH) {
    const [u] = await db.select().from(users).where(eq(users.id, ctx.id)).limit(1);
    if (!u?.emailVerifiedAt) {
      return { error: "Verify your email before publishing your profile." };
    }
  }

  const displayName = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200);
  const businessName = plainTextFromInput(formData.get("businessName")?.toString() ?? "", 200);
  const bio = plainTextFromInput(formData.get("bio")?.toString() ?? "", 5000);
  const category = plainTextFromInput(formData.get("category")?.toString() ?? "", 120);
  const city = plainTextFromInput(formData.get("city")?.toString() ?? "", 120);
  const region = plainTextFromInput(formData.get("region")?.toString() ?? "", 120);
  const rawCountry = plainTextFromInput(formData.get("countryCode")?.toString() ?? "", 2).toUpperCase();
  const countryCode = rawCountry === "US" || rawCountry === "CA" ? rawCountry : null;
  const rawPostal = plainTextFromInput(formData.get("postalCode")?.toString() ?? "", 20);
  const postalCode =
    rawPostal.length === 0
      ? ""
      : countryCode === "US"
        ? rawPostal.replace(/\s/g, "").toUpperCase()
        : rawPostal.replace(/\s+/g, " ").toUpperCase();
  const serviceArea = plainTextFromInput(formData.get("serviceArea")?.toString() ?? "", 2000);
  const contactEmail = plainTextFromInput(formData.get("contactEmail")?.toString() ?? "", 320);
  const contactPhone = plainTextFromInput(formData.get("contactPhone")?.toString() ?? "", 40);
  const timezone = plainTextFromInput(formData.get("timezone")?.toString() ?? "", 64) || "America/Toronto";
  const paymentCash = formData.get("paymentCash") === "on";
  const paymentEtransfer = formData.get("paymentEtransfer") === "on";
  const paymentInPersonCreditDebit = formData.get("paymentInPersonCreditDebit") === "on";
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

  const websiteUrl = optionalHttpUrl(formData.get("websiteUrl")?.toString() ?? "", 500);
  const socialFacebookUrl = optionalHttpUrl(formData.get("socialFacebookUrl")?.toString() ?? "", 500);
  const socialInstagramUrl = optionalHttpUrl(formData.get("socialInstagramUrl")?.toString() ?? "", 500);
  const socialYoutubeUrl = optionalHttpUrl(formData.get("socialYoutubeUrl")?.toString() ?? "", 500);
  const socialTiktokUrl = optionalHttpUrl(formData.get("socialTiktokUrl")?.toString() ?? "", 500);

  await db
    .update(providers)
    .set({
      displayName: displayName || "Provider",
      businessName: businessName || null,
      bio,
      category,
      city,
      countryCode,
      region: region || null,
      postalCode: postalCode || null,
      serviceArea,
      websiteUrl,
      socialFacebookUrl,
      socialInstagramUrl,
      socialYoutubeUrl,
      socialTiktokUrl,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      timezone,
      paymentCash,
      paymentEtransfer,
      paymentInPersonCreditDebit,
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

  const geo =
    countryCode && (postalCode || city)
      ? await geocodeProviderAddress({
          postalCode,
          city,
          region,
          countryCode,
        })
      : null;
  if (geo) {
    await db
      .update(providers)
      .set({
        latitude: geo.lat,
        longitude: geo.lon,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, ctx.providerId));
  } else if (!postalCode && !city) {
    await db
      .update(providers)
      .set({
        latitude: null,
        longitude: null,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, ctx.providerId));
  }

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
 * Onboarding only: save username + display name in one step, then continue to the first-service step.
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

  const displayTaken = await isDisplayNameTakenByOtherProvider(db, ctx.providerId, displayName);
  if (displayTaken) {
    return { error: "That display name is already in use. Try a small variation." };
  }

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

  await maybeActivateReferralForProvider(db, ctx.providerId);

  await emitOnboardingIdentityCompleted(db, {
    providerId: ctx.providerId,
    userId: ctx.id,
    actorType: "user",
  });

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/onboarding/first-service");
  revalidatePath("/dashboard/onboarding/customers");
  revalidatePath("/dashboard/onboarding/share");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/${raw}`);
  if (before?.username && before.username !== raw) {
    revalidatePath(`/${before.username}`);
  }
  redirect("/dashboard/onboarding/first-service");
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
  if (ENFORCE_VERIFIED_EMAIL_FOR_PUBLISH) {
    const [u] = await db.select().from(users).where(eq(users.id, ctx.id)).limit(1);
    if (!u?.emailVerifiedAt) {
      return { error: "Verify your email before publishing your profile." };
    }
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

export async function updateProviderProfileImageKey(formData: FormData): Promise<ProfileState> {
  if (!(await csrfOk(formData, { action: "updateProviderProfileImageKey" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const key = plainTextFromInput(formData.get("profileImageKey")?.toString() ?? "", 512).trim();
  if (!key || key.includes("..") || key.startsWith("/")) {
    return { error: "Invalid image key." };
  }
  const s3Prefix = `profiles/${ctx.providerId}/`;
  const localPrefix = `uploads/profiles/${ctx.providerId}/`;
  if (!key.startsWith(s3Prefix) && !key.startsWith(localPrefix)) {
    return { error: "Invalid image key." };
  }
  const db = getDb();
  const [before] = await db
    .select({ username: providers.username })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);
  await db
    .update(providers)
    .set({ profileImageKey: key, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));
  revalidatePath("/dashboard/profile");
  if (before?.username) revalidatePath(`/${before.username}`);
  return { success: "Image saved." };
}
