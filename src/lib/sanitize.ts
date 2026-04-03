/**
 * Escape HTML entities for safe text rendering (avoid XSS when using dangerouslySetInnerHTML is forbidden).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip tags and collapse whitespace for plain-text fields */
export function plainTextFromInput(raw: string, maxLen: number): string {
  const stripped = raw.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
  return stripped;
}

/** Normalize optional marketing URLs (website, social profiles). Returns null if empty or invalid. */
export function optionalHttpUrl(raw: string, maxLen: number): string | null {
  const t = raw.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
  if (!t) return null;
  let u = t;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const p = new URL(u);
    if (p.protocol !== "http:" && p.protocol !== "https:") return null;
    if (p.username || p.password) return null;
    const out = p.href;
    return out.length > maxLen ? out.slice(0, maxLen) : out;
  } catch {
    return null;
  }
}
