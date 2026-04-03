import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { availabilityRules, providers, services } from "@/db/schema";
import { haversineKm } from "@/lib/geo/haversine";
import { geocodeWithNominatim } from "@/lib/geocoding/nominatim";
import { getProviderSearchPoint } from "@/lib/geocoding/provider-search-location";

export type MarketplaceProviderRow = {
  username: string;
  displayName: string;
  category: string;
  city: string;
  serviceArea: string;
  profileImageKey: string | null;
  /** Up to three active service names for cards. */
  topServices: string[];
  /** Total active services (for “& more” on cards). */
  totalServiceCount: number;
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

function luxonToJsWeekday(dt: DateTime): number {
  return dt.weekday === 7 ? 0 : dt.weekday;
}

function providerOpenOnCalendarDate(timezone: string, dateISO: string, rules: { dayOfWeek: number; isActive: boolean }[]) {
  const day = DateTime.fromISO(dateISO, { zone: timezone || "America/Toronto" });
  if (!day.isValid) return true;
  const jsDow = luxonToJsWeekday(day);
  return rules.some((r) => r.isActive && r.dayOfWeek === jsDow);
}

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
  /** YYYY-MM-DD — keep providers who have weekly hours on that weekday in their timezone. */
  availableDate?: string;
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
  const availableDate = (filters.availableDate ?? "").trim();
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
      id: providers.id,
      username: providers.username,
      displayName: providers.displayName,
      category: providers.category,
      city: providers.city,
      serviceArea: providers.serviceArea,
      latitude: providers.latitude,
      longitude: providers.longitude,
      countryCode: providers.countryCode,
      timezone: providers.timezone,
      profileImageKey: providers.profileImageKey,
    })
    .from(providers)
    .where(and(...conditions))
    .limit(MAX_CANDIDATES);

  const providerIds = rows.map((r) => r.id);
  const topServicesMap = new Map<string, string[]>();
  const serviceCountMap = new Map<string, number>();
  if (providerIds.length) {
    const svcRows = await db
      .select({
        providerId: services.providerId,
        name: services.name,
        sortOrder: services.sortOrder,
      })
      .from(services)
      .where(and(inArray(services.providerId, providerIds), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name));
    for (const s of svcRows) {
      serviceCountMap.set(s.providerId, (serviceCountMap.get(s.providerId) ?? 0) + 1);
      const cur = topServicesMap.get(s.providerId) ?? [];
      if (cur.length < 3) {
        cur.push(s.name);
        topServicesMap.set(s.providerId, cur);
      }
    }
  }

  const rulesByProvider = new Map<string, { dayOfWeek: number; isActive: boolean }[]>();
  if (availableDate && /^\d{4}-\d{2}-\d{2}$/.test(availableDate) && providerIds.length) {
    const ruleRows = await db
      .select({
        providerId: availabilityRules.providerId,
        dayOfWeek: availabilityRules.dayOfWeek,
        isActive: availabilityRules.isActive,
      })
      .from(availabilityRules)
      .where(inArray(availabilityRules.providerId, providerIds));
    for (const rr of ruleRows) {
      const list = rulesByProvider.get(rr.providerId) ?? [];
      list.push({ dayOfWeek: rr.dayOfWeek, isActive: rr.isActive });
      rulesByProvider.set(rr.providerId, list);
    }
  }

  let working = rows;
  if (availableDate && /^\d{4}-\d{2}-\d{2}$/.test(availableDate)) {
    working = working.filter((r) =>
      providerOpenOnCalendarDate(r.timezone, availableDate, rulesByProvider.get(r.id) ?? [])
    );
  }

  const toPublicRow = (r: (typeof rows)[number]): MarketplaceProviderRow => ({
    username: r.username,
    displayName: r.displayName,
    category: r.category,
    city: r.city,
    serviceArea: r.serviceArea,
    profileImageKey: r.profileImageKey,
    topServices: topServicesMap.get(r.id) ?? [],
    totalServiceCount: serviceCountMap.get(r.id) ?? 0,
    latitude: r.latitude,
    longitude: r.longitude,
  });

  if (!locationRaw) {
    const results: MarketplaceProviderRow[] = working.slice(0, limit).map(toPublicRow);
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

  const scored = working
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
    ...toPublicRow(x.row),
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
