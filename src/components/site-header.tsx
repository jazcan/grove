import { getSessionUser } from "@/lib/session";
import { SiteHeaderClient } from "./site-header.client";

export async function SiteHeader() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error("[SiteHeader] session lookup failed", e);
  }

  return (
    <SiteHeaderClient isLoggedIn={!!user} isAdmin={user?.role === "admin"} />
  );
}
