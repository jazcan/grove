import { randomBytes } from "crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { providers } from "@/db/schema";
import { isValidUsername } from "@/lib/reserved-usernames";

/** Matches usernames auto-assigned at signup (`prov-` + 12 hex chars). */
export function isProvisionalProviderUsername(username: string): boolean {
  return /^prov-[a-f0-9]{12}$/i.test(username.trim());
}

/**
 * Lowercase slug from a display name (same idea as admin seeded provider hints).
 * Strips combining marks so accented characters become ASCII letters where possible.
 */
export function slugifyDisplayNameToUsernameHint(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function pushCandidate(out: string[], seen: Set<string>, candidate: string) {
  const s = candidate.toLowerCase();
  if (seen.has(s)) return;
  if (s.length < 3 || s.length > 64) return;
  if (!isValidUsername(s)) return;
  seen.add(s);
  out.push(s);
}

/**
 * Ordered username candidates derived from display name, then stable id-based fallbacks.
 */
export function buildOnboardingUsernameCandidates(displayName: string, opts?: { providerId?: string }): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const base = slugifyDisplayNameToUsernameHint(displayName);

  if (base.length >= 3) {
    pushCandidate(out, seen, base);
    pushCandidate(out, seen, `${base}-2`);
    pushCandidate(out, seen, `${base}-3`);
    pushCandidate(out, seen, `${base}-book`);
    pushCandidate(out, seen, `${base}-hq`);
    pushCandidate(out, seen, `${base}-co`);
  } else if (base.length > 0) {
    pushCandidate(out, seen, `${base}-hub`);
    pushCandidate(out, seen, `${base}-co`);
    pushCandidate(out, seen, `${base}-hq`);
    pushCandidate(out, seen, `${base}-book`);
  }

  const id = opts?.providerId?.replace(/-/g, "") ?? "";
  if (id.length >= 8) {
    pushCandidate(out, seen, `book-${id.slice(0, 8)}`);
    pushCandidate(out, seen, `svc-${id.slice(0, 8)}`);
  }
  if (id.length >= 6) {
    for (let n = 2; n <= 24; n++) {
      pushCandidate(out, seen, `user-${id.slice(0, 6)}-${n}`);
    }
  }

  for (let i = 0; i < 12; i++) {
    pushCandidate(out, seen, `prov-${randomBytes(5).toString("hex")}`);
  }

  return out;
}

export async function isDisplayNameTakenByOtherProvider(
  db: Database,
  providerId: string,
  normalizedDisplayName: string
): Promise<boolean> {
  if (!normalizedDisplayName) return false;
  const lower = normalizedDisplayName.toLowerCase();
  const [row] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(and(sql`lower(${providers.displayName}) = ${lower}`, ne(providers.id, providerId)))
    .limit(1);
  return Boolean(row);
}

export async function pickFirstAvailableUsername(
  db: Database,
  excludeProviderId: string,
  candidates: string[]
): Promise<{ username: string } | null> {
  for (const u of candidates) {
    const [taken] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.username, u))
      .limit(1);
    if (!taken || taken.id === excludeProviderId) {
      return { username: u };
    }
  }
  return null;
}
