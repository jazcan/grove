import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { haversineKm } from "@/lib/geo/haversine";
import { geocodeWithNominatim } from "@/lib/geocoding/nominatim";
import { getProviderSearchPoint } from "@/lib/geocoding/provider-search-location";

export type MarketplaceProviderRow = {
  username: string;
  displayName: string;
  category: string;
  city: string;
  serviceArea: string;
  /** Present when search used a location + radius. */
  distanceKm?: number;
  latitude: number | null;
  longitude: number | null;
};

export type MarketplaceSearchOutcome = {
  results: MarketplaceProviderRow[];
  /** True when user provided a location but geocoding failed. */
  geocodeFailed: boolean;
  /** Set when location-based search ran successfully. */
  searchCenter: { lat: number; lng: number } | null;
  /** Radius used (km) when location search ran; otherwise null. */
  radiusKmUsed: number | null;
  usedLocationFilter: boolean;
};

const DEFAULT_RADIUS_KM = 25;
const MAX_CANDIDATES = 400;

function parseRadiusKm(raw: string | undefined): number {
  const n = Number(raw);
  const allowed = [5, 10, 25, 50, 100];
  if (Number.isFinite(n) && allowed.includes(n)) return n;
  return DEFAULT_RADIUS_KM;
}

/**
 * Marketplace discovery: optional text (service keyword) + category, optional location + radius (km).
 * Backward compatible: `city` is treated as `location` when `location` is absent.
 */
export async function searchDiscoverableProviders(filters: {
  q?: string;
  category?: string;
  /** Postal/ZIP, city, or "City, ST" — combined location string */
  location?: string;
  /** @deprecated use `location` */
  city?: string;
  /** Search context for geocoding (CA | US). */
  country?: string;
  radiusKm?: string;
  limit?: number;
}): Promise<MarketplaceSearchOutcome> {
  const db = getDb();
  const limit = Math.min(filters.limit ?? 50, 100);
  const q = (filters.q ?? "").trim();
  const category = (filters.category ?? "").trim();
  const locationRaw = (filters.location ?? filters.city ?? "").trim();
  const countryRaw = (filters.country ?? "").trim().toUpperCase();
  const countryHint: "CA" | "US" | undefined =
    countryRaw === "US" ? "US" : countryRaw === "CA" ? "CA" : undefined;

  const conditions = [eq(providers.publicProfileEnabled, true), eq(providers.discoverable, true)];

  if (category) {
    conditions.push(ilike(providers.category, `%${category}%`));
  }
  if (q) {
    conditions.push(
      or(
        ilike(providers.displayName, `%${q}%`),
        ilike(providers.bio, `%${q}%`),
        ilike(providers.category, `%${q}%`)
      )!
    );
  }

  const rows = await db
    .select({
      username: providers.username,
      displayName: providers.displayName,
      category: providers.category,
      city: providers.city,
      serviceArea: providers.serviceArea,
      latitude: providers.latitude,
      longitude: providers.longitude,
      countryCode: providers.countryCode,
    })
    .from(providers)
    .where(and(...conditions))
    .limit(MAX_CANDIDATES);

  if (!locationRaw) {
    const results: MarketplaceProviderRow[] = rows.slice(0, limit).map((r) => ({
      username: r.username,
      displayName: r.displayName,
      category: r.category,
      city: r.city,
      serviceArea: r.serviceArea,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    return {
      results,
      geocodeFailed: false,
      searchCenter: null,
      radiusKmUsed: null,
      usedLocationFilter: false,
    };
  }

  const radiusKm = parseRadiusKm(filters.radiusKm);
  const geoQuery =
    locationRaw +
    (countryHint === "US" ? ", USA" : countryHint === "CA" ? ", Canada" : "");

  const center = await geocodeWithNominatim(geoQuery, { countryCode: countryHint });
  if (!center) {
    return {
      results: [],
      geocodeFailed: true,
      searchCenter: null,
      radiusKmUsed: radiusKm,
      usedLocationFilter: true,
    };
  }

  const scored = rows
    .map((r) => {
      const pt = getProviderSearchPoint({
        latitude: r.latitude,
        longitude: r.longitude,
        countryCode: r.countryCode,
      });
      const distanceKm = haversineKm(center.lat, center.lon, pt.lat, pt.lng);
      return {
        row: r,
        pt,
        distanceKm,
      };
    })
    .filter((x) => x.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const results: MarketplaceProviderRow[] = scored.slice(0, limit).map((x) => ({
    username: x.row.username,
    displayName: x.row.displayName,
    category: x.row.category,
    city: x.row.city,
    serviceArea: x.row.serviceArea,
    distanceKm: Math.round(x.distanceKm * 10) / 10,
    latitude: x.pt.lat,
    longitude: x.pt.lng,
  }));

  return {
    results,
    geocodeFailed: false,
    searchCenter: { lat: center.lat, lng: center.lon },
    radiusKmUsed: radiusKm,
    usedLocationFilter: true,
  };
}
