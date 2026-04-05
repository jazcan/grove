import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";

/** Public display name for signup UX when `?ref=` matches a provider’s referral code. */
export async function getReferrerDisplayNameForCode(normalizedCode: string): Promise<string | null> {
  const code = normalizedCode.trim();
  if (!code) return null;
  const db = getDb();
  const [row] = await db
    .select({ displayName: providers.displayName })
    .from(providers)
    .where(eq(providers.referralCode, code))
    .limit(1);
  const raw = row?.displayName?.trim();
  if (!raw || raw === "New provider") return null;
  return raw;
}
