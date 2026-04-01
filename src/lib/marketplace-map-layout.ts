/**
 * Deterministic pseudo-positions when no geographic search ran (keyword/category only).
 */
export function marketplacePinPosition(
  username: string,
  index: number
): { topPct: number; leftPct: number } {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (Math.imul(31, h) + username.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(h);
  const top = 20 + (abs % 38) + (index * 11) % 14;
  const left = 16 + ((abs >> 4) % 42) + (index * 9) % 12;
  return {
    topPct: Math.min(82, Math.max(14, top)),
    leftPct: Math.min(86, Math.max(14, left)),
  };
}

export type MapMarkerCoords = {
  username: string;
  displayName: string;
  lat: number;
  lng: number;
};

/**
 * Map pin positions from WGS84 coordinates relative to search center and radius (preview panel, not tile maps).
 */
export function marketplaceMapLayoutFromCoordinates(
  center: { lat: number; lng: number },
  radiusKm: number,
  markers: MapMarkerCoords[]
): Array<{ username: string; displayName: string; topPct: number; leftPct: number }> {
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const padLat = Math.max(radiusKm / 111, 0.02);
  const padLng = Math.max(radiusKm / (111 * Math.max(cosLat, 0.15)), 0.02);
  const minLat = center.lat - padLat;
  const maxLat = center.lat + padLat;
  const minLng = center.lng - padLng;
  const maxLng = center.lng + padLng;
  const dLat = maxLat - minLat || 1;
  const dLng = maxLng - minLng || 1;

  return markers.map((m) => {
    const lat = Math.min(maxLat, Math.max(minLat, m.lat));
    const lng = Math.min(maxLng, Math.max(minLng, m.lng));
    const topPct = 8 + ((maxLat - lat) / dLat) * 84;
    const leftPct = 8 + ((lng - minLng) / dLng) * 84;
    return {
      username: m.username,
      displayName: m.displayName,
      topPct: Math.min(92, Math.max(8, topPct)),
      leftPct: Math.min(92, Math.max(8, leftPct)),
    };
  });
}
