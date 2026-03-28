/**
 * Deterministic pseudo-positions for the marketplace map preview (no lat/lng in DB yet).
 * Same inputs always yield the same percentages — safe for SSR and future real coordinates.
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
