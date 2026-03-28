/**
 * Normalize Shopify shop parameter to hostname `*.myshopify.com`.
 */
export function normalizeShopParam(shop: string): string | null {
  let s = shop.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  const slash = s.indexOf("/");
  if (slash !== -1) s = s.slice(0, slash);
  if (!s.endsWith(".myshopify.com")) {
    if (s.includes(".")) return null;
    s = `${s}.myshopify.com`;
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) return null;
  return s;
}

export function shopFromSessionDest(dest: string): string | null {
  try {
    const host = new URL(dest).hostname.toLowerCase();
    return normalizeShopParam(host);
  } catch {
    return null;
  }
}
