/** Replace `{{key}}` placeholders in a template string. */
export function interpolateTemplate(
  body: string,
  vars: Record<string, string>
): string {
  let out = body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}
