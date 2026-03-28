/**
 * Validates common env vars for local UAT (no secret values printed).
 * Loads .env.local then .env into process.env if not already set.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvFiles(): void {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
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

function fail(msg: string): never {
  console.error(`[uat:env] ${msg}`);
  process.exit(1);
}

function warn(msg: string): void {
  console.warn(`[uat:env] WARN: ${msg}`);
}

loadEnvFiles();

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (Number.isFinite(nodeMajor) && nodeMajor < 20) {
  warn(`Node.js ${process.version} detected; README recommends Node 20+.`);
}

if (!process.env.DATABASE_URL?.trim()) {
  fail("DATABASE_URL is missing or empty.");
}

const session = process.env.SESSION_SECRET ?? "";
if (session.length < 16) {
  fail("SESSION_SECRET must be at least 16 characters (README recommends 32+).");
}
if (session.length < 32) {
  warn("SESSION_SECRET is under 32 characters; README recommends 32+.");
}

const csrf = process.env.CSRF_SECRET ?? "";
if (csrf.length < 16) {
  fail("CSRF_SECRET must be at least 16 characters.");
}

try {
  const u = new URL(process.env.APP_URL ?? "");
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    fail("APP_URL must be an http(s) URL.");
  }
} catch {
  fail("APP_URL is missing or not a valid URL.");
}

console.log("[uat:env] OK: DATABASE_URL, SESSION_SECRET, CSRF_SECRET, APP_URL present.");

const redis = process.env.REDIS_URL?.trim();
if (!redis) {
  warn("REDIS_URL unset — notification worker jobs will not run (see README).");
} else {
  console.log("[uat:env] REDIS_URL is set (run `npm run worker` for queued email).");
}

const resend = process.env.RESEND_API_KEY?.trim();
if (!resend) {
  warn("RESEND_API_KEY unset — email sends may log only.");
}

const admins = process.env.ADMIN_EMAILS?.trim();
if (!admins) {
  warn("ADMIN_EMAILS unset — admin UAT (plan 7) needs an admin email configured at sign-up.");
} else {
  console.log("[uat:env] ADMIN_EMAILS is set.");
}
