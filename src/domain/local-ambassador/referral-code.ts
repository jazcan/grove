import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { providers } from "@/db/schema";

/** Unambiguous uppercase alphanumeric (no 0, O, I, 1, L). */
const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const CODE_LEN = 10;

export function normalizeReferralCodeInput(raw: string | null | undefined): string {
  if (raw == null) return "";
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
}

export function randomReferralCode(): string {
  const buf = randomBytes(CODE_LEN);
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += REFERRAL_CODE_ALPHABET[buf[i]! % REFERRAL_CODE_ALPHABET.length];
  }
  return out;
}

/** Allocate a unique `providers.referral_code` (works inside a transaction or on the main pool). */
export async function allocateUniqueReferralCode(db: Database, maxAttempts = 32): Promise<string> {
  for (let a = 0; a < maxAttempts; a++) {
    const code = randomReferralCode();
    const [hit] = await db.select({ id: providers.id }).from(providers).where(eq(providers.referralCode, code)).limit(1);
    if (!hit) return code;
  }
  throw new Error("Could not allocate a unique referral code.");
}
