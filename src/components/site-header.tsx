import { getSessionUser } from "@/lib/session";
import { SiteHeaderClient } from "./site-header.client";

export async function SiteHeader() {
  const user = await getSessionUser();
  return <SiteHeaderClient isLoggedIn={!!user} isAdmin={user?.role === "admin"} />;
}
