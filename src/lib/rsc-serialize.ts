/**
 * Coerce values to plain strings for RSC → client component props.
 * React Flight / byteLength expects strings; Date and other values must not cross as-is.
 */
export function serialString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}
