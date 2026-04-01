import { geocodeWithNominatim } from "@/lib/geocoding/nominatim";

/**
 * Best-effort geocode for a provider base location (saved on profile update).
 */
export async function geocodeProviderAddress(parts: {
  postalCode: string;
  city: string;
  region: string;
  countryCode: string | null;
}): Promise<{ lat: number; lon: number } | null> {
  const cc = (parts.countryCode ?? "CA").toUpperCase() === "US" ? "US" : "CA";
  const bits = [parts.postalCode.trim(), parts.city.trim(), parts.region.trim(), cc === "US" ? "USA" : "Canada"].filter(
    Boolean
  );
  const q = bits.join(", ");
  if (!q.trim()) return null;
  return geocodeWithNominatim(q, { countryCode: cc });
}
