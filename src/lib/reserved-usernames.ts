const RESERVED = new Set([
  "login",
  "signup",
  "logout",
  "dashboard",
  "admin",
  "api",
  "verify-email",
  "forgot-password",
  "reset-password",
  "marketplace",
  "for-providers",
  "settings",
  "book",
  "p",
  "u",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);

export function isReservedUsername(s: string): boolean {
  return RESERVED.has(s.toLowerCase());
}

export function isValidUsername(s: string): boolean {
  if (s.length < 3 || s.length > 64) return false;
  if (isReservedUsername(s)) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s) || /^[a-z0-9]{3}$/.test(s);
}
