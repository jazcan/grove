/**
 * Recursively converts Date instances to ISO strings so values are safe for
 * JSON round-trips and any encoding paths that expect strings (not Date).
 */
export function normalizeDates(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeDates(v)]));
  }
  return value;
}
