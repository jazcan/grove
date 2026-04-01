/**
 * Apply a raw SQL migration file when `drizzle-kit migrate` is unavailable
 * (this repo ships SQL files without drizzle/meta/_journal.json).
 *
 * Usage (from repo root):
 *   npx tsx scripts/apply-sql-migration.ts drizzle/0011_customer_account_readiness.sql
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

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
  const rel = process.argv[2];
  if (!rel) {
    console.error("Usage: npx tsx scripts/apply-sql-migration.ts <path-to.sql>");
    process.exit(1);
  }
  loadEnvFiles();
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error("[apply-sql-migration] DATABASE_URL is not set.");
    process.exit(1);
  }
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) {
    console.error(`[apply-sql-migration] File not found: ${path}`);
    process.exit(1);
  }
  const body = readFileSync(path, "utf8");
  const db = postgres(url, { max: 1 });
  try {
    await db.unsafe(body);
    console.log(`[apply-sql-migration] Applied: ${rel}`);
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
