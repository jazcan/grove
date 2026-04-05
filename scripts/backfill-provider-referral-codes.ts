/**
 * Assigns a unique `providers.referral_code` to any row where it is still NULL.
 * Safe to run multiple times; only updates rows with NULL codes.
 *
 * Run after `drizzle-kit push` when `referral_code` is nullable:
 *   npx tsx scripts/backfill-provider-referral-codes.ts
 *
 * Requires DATABASE_URL (loads .env.local / .env).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { eq, isNull } from "drizzle-orm";
import { closeDbConnection, getDb } from "@/db";
import { providers } from "@/db/schema";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";

function loadEnvFiles(): void {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[backfill-provider-referral-codes] DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  const missing = await db
    .select({ id: providers.id })
    .from(providers)
    .where(isNull(providers.referralCode));

  if (missing.length === 0) {
    console.log("[backfill-provider-referral-codes] No providers need a referral code.");
    await closeDbConnection();
    return;
  }

  let n = 0;
  for (const row of missing) {
    const code = await allocateUniqueReferralCode(db);
    await db
      .update(providers)
      .set({ referralCode: code, updatedAt: new Date() })
      .where(eq(providers.id, row.id));
    n++;
    console.log(`[backfill-provider-referral-codes] ${row.id} -> ${code}`);
  }

  console.log(`[backfill-provider-referral-codes] Done. Updated ${n} provider(s).`);
  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  void closeDbConnection().finally(() => process.exit(1));
});
