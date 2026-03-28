import { eq, asc } from "drizzle-orm";
import type { Database } from "@/db";
import { positioningTiers, pricingProfiles } from "@/db/schema";

const DEFAULT_TIERS: { label: string; multiplier: string; sortOrder: number }[] = [
  { label: "Standard", multiplier: "1.0000", sortOrder: 0 },
  { label: "Enhanced", multiplier: "1.1000", sortOrder: 1 },
  { label: "Premium", multiplier: "1.2000", sortOrder: 2 },
];

/**
 * Ensures the provider has a pricing profile and default positioning tiers (idempotent).
 */
export async function ensureDefaultPricingProfile(
  db: Database,
  providerId: string
): Promise<{ profileId: string; tiers: { id: string; label: string; multiplier: string; sortOrder: number }[] }> {
  const [existing] = await db
    .select({ id: pricingProfiles.id })
    .from(pricingProfiles)
    .where(eq(pricingProfiles.providerId, providerId))
    .limit(1);

  if (existing) {
    const tiers = await db
      .select({
        id: positioningTiers.id,
        label: positioningTiers.label,
        multiplier: positioningTiers.multiplier,
        sortOrder: positioningTiers.sortOrder,
      })
      .from(positioningTiers)
      .where(eq(positioningTiers.profileId, existing.id))
      .orderBy(asc(positioningTiers.sortOrder));
    if (tiers.length > 0) {
      return {
        profileId: existing.id,
        tiers: tiers.map((t) => ({
          id: t.id,
          label: t.label,
          multiplier: String(t.multiplier),
          sortOrder: t.sortOrder,
        })),
      };
    }
    await db.insert(positioningTiers).values(
      DEFAULT_TIERS.map((row) => ({
        profileId: existing.id,
        label: row.label,
        multiplier: row.multiplier,
        sortOrder: row.sortOrder,
      }))
    );
    const inserted = await db
      .select({
        id: positioningTiers.id,
        label: positioningTiers.label,
        multiplier: positioningTiers.multiplier,
        sortOrder: positioningTiers.sortOrder,
      })
      .from(positioningTiers)
      .where(eq(positioningTiers.profileId, existing.id))
      .orderBy(asc(positioningTiers.sortOrder));
    return {
      profileId: existing.id,
      tiers: inserted.map((t) => ({
        id: t.id,
        label: t.label,
        multiplier: String(t.multiplier),
        sortOrder: t.sortOrder,
      })),
    };
  }

  const [profile] = await db
    .insert(pricingProfiles)
    .values({ providerId, name: "Default", currency: "CAD" })
    .returning({ id: pricingProfiles.id });

  if (!profile) throw new Error("PRICING_PROFILE_FAILED");

  await db.insert(positioningTiers).values(
    DEFAULT_TIERS.map((row) => ({
      profileId: profile.id,
      label: row.label,
      multiplier: row.multiplier,
      sortOrder: row.sortOrder,
    }))
  );

  const tiers = await db
    .select({
      id: positioningTiers.id,
      label: positioningTiers.label,
      multiplier: positioningTiers.multiplier,
      sortOrder: positioningTiers.sortOrder,
    })
    .from(positioningTiers)
    .where(eq(positioningTiers.profileId, profile.id))
    .orderBy(asc(positioningTiers.sortOrder));

  return {
    profileId: profile.id,
    tiers: tiers.map((t) => ({
      id: t.id,
      label: t.label,
      multiplier: String(t.multiplier),
      sortOrder: t.sortOrder,
    })),
  };
}
