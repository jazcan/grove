export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  return d.length ? d : null;
}
