/** Allows same-origin path + query only (no protocol-relative or scheme URLs). */
export function isSafeInternalPath(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//") || p.startsWith("/\\")) return false;
  if (p.includes("://")) return false;
  if (p.includes("@")) return false;
  return true;
}
