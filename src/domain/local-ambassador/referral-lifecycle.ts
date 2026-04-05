import { and, count, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { providers, providerReferrals, services } from "@/db/schema";
import { normalizeReferralCodeInput } from "@/domain/local-ambassador/referral-code";

/**
 * A referred provider counts as "activated" when they have locked in a public username
 * (`username_locked_at`) and at least one active service. This matches a practical
 * "they're really set up" bar without requiring full marketplace publish.
 */
export async function maybeActivateReferralForProvider(db: Database, referredProviderId: string): Promise<void> {
  const [prov] = await db
    .select({ usernameLockedAt: providers.usernameLockedAt })
    .from(providers)
    .where(eq(providers.id, referredProviderId))
    .limit(1);

  const [svcRow] = await db
    .select({ n: count() })
    .from(services)
    .where(and(eq(services.providerId, referredProviderId), eq(services.isActive, true)));

  if (!prov?.usernameLockedAt || !Number(svcRow?.n ?? 0)) return;

  const now = new Date();
  await db
    .update(providerReferrals)
    .set({
      status: "activated",
      activatedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(providerReferrals.referredProviderId, referredProviderId), eq(providerReferrals.status, "signed_up"))
    );
}

/**
 * Records a direct referral when a new provider signs up with a valid ambassador code.
 * Invalid codes are ignored. Self-referrals and duplicates are skipped.
 */
export async function tryRecordReferralOnSignup(
  tx: Database,
  args: { newUserId: string; newProviderId: string; rawReferralCode: string }
): Promise<void> {
  const code = normalizeReferralCodeInput(args.rawReferralCode);
  if (code.length < 6) return;

  const [referrer] = await tx
    .select({
      id: providers.id,
      userId: providers.userId,
    })
    .from(providers)
    .where(eq(providers.referralCode, code))
    .limit(1);

  if (!referrer || referrer.id === args.newProviderId) return;
  if (referrer.userId === args.newUserId) return;

  const [existing] = await tx
    .select({ id: providerReferrals.id })
    .from(providerReferrals)
    .where(eq(providerReferrals.referredProviderId, args.newProviderId))
    .limit(1);
  if (existing) return;

  const now = new Date();
  await tx.insert(providerReferrals).values({
    referrerProviderId: referrer.id,
    referredProviderId: args.newProviderId,
    referralCodeUsed: code,
    status: "signed_up",
    signedUpAt: now,
    updatedAt: now,
  });
}

/**
 * Apply a referral code after account exists (e.g. manual entry on onboarding). Same rules as signup.
 */
export async function tryApplyReferralCodeForExistingProvider(
  db: Database,
  args: { newUserId: string; newProviderId: string; rawReferralCode: string }
): Promise<"applied" | "invalid" | "duplicate" | "self"> {
  const code = normalizeReferralCodeInput(args.rawReferralCode);
  if (code.length < 6) return "invalid";

  const [referrer] = await db
    .select({
      id: providers.id,
      userId: providers.userId,
      referralCode: providers.referralCode,
    })
    .from(providers)
    .where(eq(providers.referralCode, code))
    .limit(1);

  if (!referrer) return "invalid";
  if (referrer.id === args.newProviderId || referrer.userId === args.newUserId) return "self";

  const [existing] = await db
    .select({ id: providerReferrals.id })
    .from(providerReferrals)
    .where(eq(providerReferrals.referredProviderId, args.newProviderId))
    .limit(1);
  if (existing) return "duplicate";

  const now = new Date();
  await db.insert(providerReferrals).values({
    referrerProviderId: referrer.id,
    referredProviderId: args.newProviderId,
    referralCodeUsed: code,
    status: "signed_up",
    signedUpAt: now,
    updatedAt: now,
  });

  await maybeActivateReferralForProvider(db, args.newProviderId);
  return "applied";
}

export async function providerHasReferralAttribution(
  db: Database,
  referredProviderId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: providerReferrals.id })
    .from(providerReferrals)
    .where(eq(providerReferrals.referredProviderId, referredProviderId))
    .limit(1);
  return !!row;
}
