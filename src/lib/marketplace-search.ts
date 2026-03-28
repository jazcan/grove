import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";

export async function searchDiscoverableProviders(filters: {
  q?: string;
  city?: string;
  category?: string;
  limit?: number;
}) {
  const db = getDb();
  const conditions = [eq(providers.publicProfileEnabled, true), eq(providers.discoverable, true)];

  if (filters.city) {
    conditions.push(ilike(providers.city, `%${filters.city}%`));
  }
  if (filters.category) {
    conditions.push(ilike(providers.category, `%${filters.category}%`));
  }
  if (filters.q) {
    const q = filters.q;
    conditions.push(
      or(
        ilike(providers.displayName, `%${q}%`),
        ilike(providers.bio, `%${q}%`),
        ilike(providers.category, `%${q}%`)
      )!
    );
  }

  return db
    .select({
      username: providers.username,
      displayName: providers.displayName,
      category: providers.category,
      city: providers.city,
      serviceArea: providers.serviceArea,
    })
    .from(providers)
    .where(and(...conditions))
    .limit(filters.limit ?? 50);
}
