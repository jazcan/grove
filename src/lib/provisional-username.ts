/** Matches usernames auto-assigned at signup (`prov-` + 12 hex chars). */
const PROVISIONAL_USERNAME_RE = /^prov-[a-f0-9]{12}$/;

export function isProvisionalProviderUsername(username: string): boolean {
  return PROVISIONAL_USERNAME_RE.test(username.trim().toLowerCase());
}
