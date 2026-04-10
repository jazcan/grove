/**
 * Forward geocoding via OpenStreetMap Nominatim (no API key).
 * Respect usage policy: low volume, cache at higher layers when scaling.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

export type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
};

const USER_AGENT = "HandshakeLocal/1.0 (provider location search; contact: https://handshakelocal.com)";

export async function geocodeWithNominatim(
  query: string,
  options?: { countryCode?: "CA" | "US" }
): Promise<{ lat: number; lon: number; displayName?: string } | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "0",
  });
  if (options?.countryCode === "US") {
    params.set("countrycodes", "us");
  } else if (options?.countryCode === "CA") {
    params.set("countrycodes", "ca");
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimHit[];
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, displayName: hit.display_name };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
