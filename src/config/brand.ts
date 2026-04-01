/**
 * Customer-facing product identity.
 *
 * The repository, package name, cookies, queue names, and many internal symbols
 * may still use the codename "Grove" — only user-visible strings should use
 * `appName` (and related exports below).
 */
export const brand = {
  appName: "Handshake Local",
  /** Legacy / internal codename — logs, technical identifiers, comments. */
  internalName: "Grove",
  /** Default browser title subtitle (after the em dash). */
  shortTagline: "Service bookings for solo providers",
} as const;

export const defaultPageTitle = `${brand.appName} — ${brand.shortTagline}`;

/** Default “From” display name when `EMAIL_FROM` is unset (address may still be a dev default). */
export const defaultEmailFromLabel = `${brand.appName} <onboarding@resend.dev>`;
