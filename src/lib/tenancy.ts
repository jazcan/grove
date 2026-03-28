import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireProvider(): Promise<SessionUser & { providerId: string }> {
  const u = await requireUser();
  if (!u.providerId) {
    if (u.role === "admin") redirect("/admin");
    redirect("/dashboard/onboarding");
  }
  return { ...u, providerId: u.providerId };
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}
