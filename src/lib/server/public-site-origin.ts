import { headers } from "next/headers";
import { getPublicAppUrlForDashboardLinks, resolvePublicAppUrl } from "@/lib/env";

function isLocalHost(host: string): boolean {
  const h = host.split(":")[0]!.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Origin for provider-facing share links (copy profile URL, booking link on dashboard).
 *
 * 1. `APP_URL` when set (explicit canonical URL).
 * 2. Incoming request host — fixes Vercel when `APP_URL` is missing but the user is on a custom domain
 *    (otherwise `resolvePublicAppUrl` falls back to `VERCEL_URL` / `*.vercel.app`).
 * 3. Same fallbacks as {@link getPublicAppUrlForDashboardLinks} (`VERCEL_URL`, localhost in dev).
 */
export async function getPublicSiteOriginForUserFacingLinks(): Promise<string> {
  const fromProcess = resolvePublicAppUrl(process.env.APP_URL);
  if (fromProcess) {
    return fromProcess.replace(/\/$/, "");
  }

  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host");
  if (hostRaw) {
    const host = hostRaw.split(",")[0]!.trim();
    if (host && !isLocalHost(host)) {
      const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0]!.trim() || "https";
      try {
        return new URL(`${proto}://${host}`).origin;
      } catch {
        /* fall through */
      }
    }
  }

  return getPublicAppUrlForDashboardLinks();
}
