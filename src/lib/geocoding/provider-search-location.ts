/**
 * Runtime-only approximate coordinates for providers missing lat/lng in the database.
 * Used so radius-based discovery can still place them until real data is backfilled.
 *
 * TEMPORARY — remove once all discoverable providers have geocoded coordinates saved on profile.
 * Do not persist these values to the database.
 */
export function getFallbackProviderCoordinates(countryCode: string | null | undefined): { lat: number; lng: number } {
  const cc = (countryCode ?? "CA").trim().toUpperCase();
  if (cc === "US") {
    // ~Springfield, MO 65803 — central US placeholder
    return { lat: 37.2089, lng: -93.2923 };
  }
  // Canada or unknown — ~Fredericton area E3B 1B5
  return { lat: 45.9636, lng: -66.6431 };
}

export type ProviderLocationRow = {
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
};

/**
 * Point used for distance checks: DB coordinates when present, otherwise temporary fallback (not persisted).
 */
export function getProviderSearchPoint(row: ProviderLocationRow): { lat: number; lng: number } {
  if (row.latitude != null && row.longitude != null && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) {
    return { lat: row.latitude, lng: row.longitude };
  }
  return getFallbackProviderCoordinates(row.countryCode);
}
