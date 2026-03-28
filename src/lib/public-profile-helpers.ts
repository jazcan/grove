/**
 * Public provider profile helpers (no auth secrets).
 * Image URLs work when S3_PUBLIC_BASE_URL matches upload/presign configuration.
 */
export function publicProfileImageUrl(key: string | null | undefined): string | null {
  const k = key?.trim();
  if (!k) return null;
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${k.replace(/^\//, "")}`;
}

export function providerDisplayInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?";
}

/** One-line hero context: business name, else first line of bio (trimmed). */
export function providerHeroTeaser(businessName: string, bio: string): string | null {
  const bn = businessName.trim();
  if (bn) return bn;
  const b = bio.trim();
  if (!b) return null;
  const first = (b.split(/\n+/)[0] ?? b).trim();
  if (first.length <= 180) return first;
  return `${first.slice(0, 177)}…`;
}

export function hasProfileBio(bio: string): boolean {
  return bio.trim().length > 0;
}

export function buildProviderLocationLine(city: string, serviceArea: string): string | null {
  const c = city.trim();
  const a = serviceArea.trim();
  if (!c && !a) return null;
  if (c && a) return `${c} · ${a}`;
  return c || a;
}
