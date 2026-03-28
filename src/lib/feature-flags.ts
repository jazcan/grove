import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { featureFlags } from "@/db/schema";

const cache = new Map<string, boolean>();
let cacheAt = 0;
const TTL_MS = 30_000;

export async function isFeatureEnabled(key: string): Promise<boolean> {
  if (key === "ai_gateway" && process.env.FEATURE_AI_GATEWAY === "true") {
    return true;
  }
  const now = Date.now();
  if (now - cacheAt > TTL_MS) {
    cache.clear();
    cacheAt = now;
  }
  if (cache.has(key)) return cache.get(key)!;
  try {
    const db = getDb();
    const row = await db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);
    const v = row[0]?.enabled ?? false;
    cache.set(key, v);
    return v;
  } catch {
    return false;
  }
}
