"use server";

import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { providers, users, services } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { plainTextFromInput, optionalHttpUrl } from "@/lib/sanitize";
import { isValidUsername, isReservedUsername } from "@/lib/reserved-usernames";
import { slugifyDisplayNameToUsernameHint } from "@/lib/provider-onboarding-identity";
import { logAudit } from "@/lib/audit";
import { geocodeProviderAddress } from "@/lib/geocoding/geocode-provider-address";
import { getCanonicalTemplateRowBySlug } from "@/lib/canonical-templates";
import { ensureCanonicalTemplates } from "@/db/ensure-canonical-templates";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { emitPlatformEvent } from "@/platform/events/emit";
import { issuePasswordResetForEmail } from "@/domain/auth/issue-password-reset";
import { csrfOk, requireAdmin } from "@/actions/_guard";
import { QUICK_START_PREFILL_ID } from "@/lib/service-templates";
import type { ActionState } from "@/domain/auth/actions";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";

export type SeededCreateState =
  | undefined
  | { error: string }
  | {
      success: true;
      providerId: string;
      username: string;
      loginEmail: string;
      generatedPassword?: string;
    };

export type HandoffActionState = ActionState & {
  claimLink?: string;
  emailSent?: boolean;
};

async function pickUniqueUsername(hint: string | null): Promise<string> {
  const db = getDb();
  const candidates: string[] = [];
  if (hint) {
    const raw = slugifyDisplayNameToUsernameHint(hint);
    if (raw.length >= 3 && isValidUsername(raw) && !isReservedUsername(raw)) {
      candidates.push(raw);
    }
  }
  for (let i = 0; i < 24; i++) {
    candidates.push(`prov-${randomBytes(5).toString("hex")}`);
  }
  for (const c of candidates) {
    const [taken] = await db.select({ id: providers.id }).from(providers).where(eq(providers.username, c)).limit(1);
    if (!taken) return c;
  }
  throw new Error("Could not allocate a unique username.");
}

type ServiceSeed = {
  name: string;
  description?: string;
  durationMinutes?: number;
  priceAmount?: string;
  currency?: string;
  canonicalTemplateSlug?: string;
};

function parseServicesSeedJson(raw: string): ServiceSeed[] | "invalid" {
  const t = raw.trim();
  if (!t) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return "invalid";
  }
  if (!Array.isArray(parsed)) return "invalid";
  const out: ServiceSeed[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return "invalid";
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) return "invalid";
    out.push({
      name,
      description: typeof o.description === "string" ? o.description : undefined,
      durationMinutes: typeof o.durationMinutes === "number" ? o.durationMinutes : undefined,
      priceAmount: typeof o.priceAmount === "string" ? o.priceAmount : undefined,
      currency: typeof o.currency === "string" ? o.currency : undefined,
      canonicalTemplateSlug: typeof o.canonicalTemplateSlug === "string" ? o.canonicalTemplateSlug : undefined,
    });
  }
  return out;
}

export async function createSeededProviderAccount(
  _prev: SeededCreateState,
  formData: FormData
): Promise<SeededCreateState> {
  if (!(await csrfOk(formData, { action: "createSeededProviderAccount" }))) {
    return { error: "Invalid security token." };
  }
  const admin = await requireAdmin();
  const db = getDb();

  const emailRaw = formData.get("tempEmail")?.toString().trim().toLowerCase() ?? "";
  if (!emailRaw.includes("@") || emailRaw.length > 320) {
    return { error: "Temporary login email is invalid." };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailRaw)).limit(1);
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  let passwordPlain = formData.get("tempPassword")?.toString() ?? "";
  let generated: string | undefined;
  if (passwordPlain.length > 0 && passwordPlain.length < 10) {
    return { error: "Temporary password must be at least 10 characters, or leave blank to auto-generate." };
  }
  if (passwordPlain.length === 0) {
    generated = randomBytes(12).toString("base64url");
    passwordPlain = generated;
  }

  const displayName = plainTextFromInput(formData.get("displayName")?.toString() ?? "", 200) || "Provider";
  const businessName = plainTextFromInput(formData.get("businessName")?.toString() ?? "", 200) || null;
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

  const bio = plainTextFromInput(formData.get("bio")?.toString() ?? "", 5000);
  const serviceArea = plainTextFromInput(formData.get("serviceArea")?.toString() ?? "", 2000);
  const contactEmail = plainTextFromInput(formData.get("contactEmail")?.toString() ?? "", 320);
  const contactPhone = plainTextFromInput(formData.get("contactPhone")?.toString() ?? "", 40);
  const websiteUrl = optionalHttpUrl(formData.get("websiteUrl")?.toString() ?? "", 500);
  const internalAdminNotes = plainTextFromInput(formData.get("internalAdminNotes")?.toString() ?? "", 8000) || null;

  const publicProfileEnabled = formData.get("publicProfileEnabled") === "on";
  const discoverable = formData.get("discoverable") === "on";

  const usernameOverride = plainTextFromInput(formData.get("publicUsername")?.toString() ?? "", 64).toLowerCase();
  let username: string;
  if (usernameOverride && isValidUsername(usernameOverride) && !isReservedUsername(usernameOverride)) {
    const [taken] = await db.select({ id: providers.id }).from(providers).where(eq(providers.username, usernameOverride)).limit(1);
    if (taken) {
      return { error: "That public username is already taken." };
    }
    username = usernameOverride;
  } else {
    username = await pickUniqueUsername(businessName ?? displayName);
  }

  const servicesRaw = formData.get("servicesJson")?.toString() ?? "";
  const parsedServices = parseServicesSeedJson(servicesRaw);
  if (parsedServices === "invalid") {
    return { error: "Services JSON must be a JSON array of objects with at least a \"name\" field." };
  }

  const passwordHash = await hashPassword(passwordPlain);
  const userId = globalThis.crypto.randomUUID();
  const lockAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email: emailRaw,
      passwordHash,
      role: "provider",
      isSeededAccount: true,
      handoffStatus: "seeded",
    });
    const referralCode = await allocateUniqueReferralCode(tx);
    await tx.insert(providers).values({
      userId,
      username,
      displayName,
      businessName,
      bio,
      category,
      city,
      countryCode,
      region: region || null,
      postalCode: postalCode || null,
      serviceArea,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      websiteUrl,
      publicProfileEnabled,
      discoverable,
      internalAdminNotes,
      usernameLockedAt: lockAt,
      referralCode,
    });
  });

  const [provRow] = await db.select({ id: providers.id }).from(providers).where(eq(providers.userId, userId)).limit(1);
  const providerId = provRow!.id;

  await ensureDefaultPricingProfile(db, providerId);

  if (countryCode && (postalCode || city)) {
    const geo = await geocodeProviderAddress({
      postalCode,
      city,
      region,
      countryCode,
    });
    if (geo) {
      await db
        .update(providers)
        .set({ latitude: geo.lat, longitude: geo.lon, updatedAt: new Date() })
        .where(eq(providers.id, providerId));
    }
  }

  if (parsedServices.length > 0) {
    await ensureCanonicalTemplates(db);
    const { tiers } = await ensureDefaultPricingProfile(db, providerId);
    const defaultTier = tiers.find((t) => t.sortOrder === 0) ?? tiers[0];
    let sortOrder = 0;
    for (const s of parsedServices) {
      const slug = s.canonicalTemplateSlug?.trim() || QUICK_START_PREFILL_ID;
      const canonical = await getCanonicalTemplateRowBySlug(slug);
      if (!canonical || !canonical.isActive) continue;
      const dm = Math.max(5, Math.floor(s.durationMinutes ?? canonical.durationMinutes));
      const priceAmount = s.priceAmount ?? String(canonical.priceAmount);
      const currency = plainTextFromInput(s.currency ?? canonical.currency, 8) || canonical.currency;
      const [created] = await db
        .insert(services)
        .values({
          providerId,
          canonicalTemplateId: canonical.id,
          canonicalTemplateVersion: canonical.version,
          positioningTierId: defaultTier?.id ?? null,
          name: plainTextFromInput(s.name, 200),
          description: plainTextFromInput(s.description ?? "", 5000) || canonical.description,
          category: plainTextFromInput(canonical.category, 120),
          durationMinutes: dm,
          bufferMinutes: canonical.bufferMinutes,
          pricingType: canonical.pricingType,
          priceAmount,
          currency,
          prepInstructions: canonical.prepInstructions,
          serviceLevelsEnabled: true,
          isActive: true,
          sortOrder,
        })
        .returning({ id: services.id });
      sortOrder += 1;
      if (created) {
        await emitPlatformEvent(
          {
            name: "service.created",
            aggregateType: "service",
            aggregateId: created.id,
            tenantProviderId: providerId,
            actorUserId: admin.id,
            actorType: "user",
            payload: {
              serviceId: created.id,
              providerId,
              canonicalTemplateId: canonical.id,
              canonicalTemplateVersion: canonical.version,
            },
          },
          db
        );
      }
    }
  }

  await logAudit({
    actorUserId: admin.id,
    actorType: "user",
    tenantProviderId: providerId,
    entityType: "provider",
    entityId: providerId,
    action: "admin_seed_provider",
    metadata: { loginEmail: emailRaw, username },
  });

  revalidatePath("/admin/providers/seeded");
  revalidatePath("/admin");

  return {
    success: true,
    providerId,
    username,
    loginEmail: emailRaw,
    ...(generated ? { generatedPassword: generated } : {}),
  };
}

export async function saveHandoffTargetEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "saveHandoffTargetEmail" }))) {
    return { error: "Invalid security token." };
  }
  const admin = await requireAdmin();
  const db = getDb();
  const providerId = formData.get("providerId")?.toString().trim() ?? "";
  const target = formData.get("handoffEmail")?.toString().trim().toLowerCase() ?? "";
  if (!providerId) return { error: "Missing provider." };
  if (!target.includes("@") || target.length > 320) {
    return { error: "Real provider email is invalid." };
  }

  const [row] = await db
    .select({
      userId: users.id,
      seeded: users.isSeededAccount,
      status: users.handoffStatus,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.id, providerId))
    .limit(1);

  if (!row?.seeded) return { error: "Not a seeded provider account." };
  if (row.status === "claimed") return { error: "This account has already been claimed." };
  if (row.status !== "seeded") {
    return { error: "You can only change the handoff target while status is “Seeded.”" };
  }

  const [other] = await db.select({ id: users.id }).from(users).where(eq(users.email, target)).limit(1);
  if (other && other.id !== row.userId) {
    return { error: "That email is already used by another account. Use a different address or merge accounts outside this tool." };
  }

  await db
    .update(users)
    .set({ handoffToEmail: target, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await logAudit({
    actorUserId: admin.id,
    actorType: "user",
    tenantProviderId: providerId,
    entityType: "user",
    entityId: row.userId,
    action: "admin_handoff_target_saved",
    metadata: { handoffEmail: target },
  });

  revalidatePath("/admin/providers/seeded");
  revalidatePath(`/admin/providers/${providerId}/handoff`);
  return { success: "Handoff target email saved." };
}

export async function saveHandoffInternalNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "saveHandoffInternalNotes" }))) {
    return { error: "Invalid security token." };
  }
  const admin = await requireAdmin();
  const db = getDb();
  const providerId = formData.get("providerId")?.toString().trim() ?? "";
  const notes = plainTextFromInput(formData.get("internalAdminNotes")?.toString() ?? "", 8000) || null;
  if (!providerId) return { error: "Missing provider." };

  const [row] = await db
    .select({ seeded: users.isSeededAccount })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.id, providerId))
    .limit(1);
  if (!row?.seeded) return { error: "Not a seeded provider account." };

  await db.update(providers).set({ internalAdminNotes: notes, updatedAt: new Date() }).where(eq(providers.id, providerId));

  await logAudit({
    actorUserId: admin.id,
    actorType: "user",
    tenantProviderId: providerId,
    entityType: "provider",
    entityId: providerId,
    action: "admin_internal_notes_updated",
  });

  revalidatePath(`/admin/providers/${providerId}/handoff`);
  return { success: "Internal notes saved." };
}

export async function triggerSeededHandoff(
  _prev: HandoffActionState | undefined,
  formData: FormData
): Promise<HandoffActionState> {
  if (!(await csrfOk(formData, { action: "triggerSeededHandoff" }))) {
    return { error: "Invalid security token." };
  }
  const admin = await requireAdmin();
  const db = getDb();
  const providerId = formData.get("providerId")?.toString().trim() ?? "";
  if (!providerId) return { error: "Missing provider." };

  const [row] = await db
    .select({
      userId: users.id,
      loginEmail: users.email,
      handoffToEmail: users.handoffToEmail,
      status: users.handoffStatus,
      seeded: users.isSeededAccount,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.id, providerId))
    .limit(1);

  if (!row?.seeded) return { error: "Not a seeded provider account." };
  if (row.status === "claimed") return { error: "Already claimed." };
  if (row.status !== "seeded") {
    return { error: "Handoff was already started. Use “Resend invite” if needed." };
  }

  const target = row.handoffToEmail?.trim().toLowerCase() ?? "";
  if (!target.includes("@") || target.length > 320) {
    return { error: "Save a valid real provider email before sending handoff." };
  }

  const [other] = await db.select({ id: users.id }).from(users).where(eq(users.email, target)).limit(1);
  if (other && other.id !== row.userId) {
    return { error: "That email is already used by another account." };
  }

  await db
    .update(users)
    .set({
      email: target,
      handoffToEmail: null,
      handoffStatus: "invited",
      handoffSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.userId));

  const { claimLink, emailSent } = await issuePasswordResetForEmail({
    userId: row.userId,
    email: target,
  });

  await logAudit({
    actorUserId: admin.id,
    actorType: "user",
    tenantProviderId: providerId,
    entityType: "user",
    entityId: row.userId,
    action: "admin_handoff_invited",
    metadata: { email: target },
  });

  revalidatePath("/admin/providers/seeded");
  revalidatePath(`/admin/providers/${providerId}/handoff`);

  return {
    success: emailSent
      ? "Handoff prepared. We emailed the provider a password link."
      : "Handoff prepared. Email is not configured in this environment — copy the claim link below.",
    claimLink,
    emailSent,
  };
}

export async function resendSeededHandoffInvite(
  _prev: HandoffActionState | undefined,
  formData: FormData
): Promise<HandoffActionState> {
  if (!(await csrfOk(formData, { action: "resendSeededHandoffInvite" }))) {
    return { error: "Invalid security token." };
  }
  const admin = await requireAdmin();
  const db = getDb();
  const providerId = formData.get("providerId")?.toString().trim() ?? "";
  if (!providerId) return { error: "Missing provider." };

  const [row] = await db
    .select({
      userId: users.id,
      loginEmail: users.email,
      status: users.handoffStatus,
      seeded: users.isSeededAccount,
    })
    .from(providers)
    .innerJoin(users, eq(providers.userId, users.id))
    .where(eq(providers.id, providerId))
    .limit(1);

  if (!row?.seeded) return { error: "Not a seeded provider account." };
  if (row.status !== "invited") {
    return { error: "Resend is only available after handoff has been sent." };
  }

  const { claimLink, emailSent } = await issuePasswordResetForEmail({
    userId: row.userId,
    email: row.loginEmail,
  });

  await db
    .update(users)
    .set({ handoffSentAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await logAudit({
    actorUserId: admin.id,
    actorType: "user",
    tenantProviderId: providerId,
    entityType: "user",
    entityId: row.userId,
    action: "admin_handoff_resent",
  });

  revalidatePath("/admin/providers/seeded");
  revalidatePath(`/admin/providers/${providerId}/handoff`);

  return {
    success: emailSent ? "Invitation resent by email." : "Copy the new claim link below (dev / no email).",
    claimLink,
    emailSent,
  };
}
