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
