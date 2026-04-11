import { Suspense } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { HandshakeBrandLockup } from "@/components/brand/handshake-brand-lockup";
import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { MainNavMenu } from "@/components/nav/main-nav-menu";
import { DashboardOnboardingAssistant } from "@/components/dashboard/onboarding-assistant";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { loadAssistantPanelSnapshot } from "@/lib/assistant/panel";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { serialString } from "@/lib/rsc-serialize";
import { publicProfileImageUrl } from "@/lib/public-profile-helpers";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await requireUser();

  let setupState: Awaited<ReturnType<typeof loadProviderSetupState>> | null = null;
  let setupLoadFailed = false;
  const preProvider = !u.providerId;
  let assistantJson: string | null = null;
  let assistantCsrf = "";
  let profileAvatarUrl: string | null = null;
  if (u.providerId) {
    try {
      const db = getDb();
      const [prov] = await db
        .select({ timezone: providers.timezone, profileImageKey: providers.profileImageKey })
        .from(providers)
        .where(eq(providers.id, u.providerId))
        .limit(1);
      profileAvatarUrl = publicProfileImageUrl(prov?.profileImageKey ?? null);
      const tz = prov?.timezone ?? "America/Toronto";
      setupState = await loadProviderSetupState(db, u.providerId, tz);
    } catch (e) {
      console.error("[dashboard layout] failed to load provider setup", e);
      setupLoadFailed = true;
    }
    try {
      assistantCsrf = await getCsrfTokenForForm();
    } catch (e) {
      console.error("[dashboard layout] getCsrfTokenForForm", e);
    }
    const db = getDb();
    const assistantSnapshot = await loadAssistantPanelSnapshot(db, u.providerId, u.id);
    assistantJson = JSON.stringify(assistantSnapshot);
  }

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isOnboardingRoute =
    pathname === "/dashboard/onboarding" || pathname.startsWith("/dashboard/onboarding/");
  const initialExpanded = isOnboardingRoute
    ? false
    : setupLoadFailed
      ? true
      : (setupState?.needsSetup ?? true) || (setupState?.onboardingTailPending ?? false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_88%,transparent)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <HandshakeBrandLockup href="/dashboard" className="min-w-0" />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <MainNavMenu variant="dashboard" isAdmin={u.role === "admin"} />
            <DashboardAccountMenu userEmail={u.email} profileImageUrl={profileAvatarUrl} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-5 sm:py-10 sm:pb-32">{children}</div>

      <Suspense fallback={null}>
        <DashboardOnboardingAssistant
          key={[u.providerId ?? "pre", setupLoadFailed ? "err" : setupState?.needsSetup ? "need" : "ok"].join(":")}
          setup={setupState}
          setupLoadFailed={setupLoadFailed}
          preProvider={preProvider}
          initialExpanded={initialExpanded}
          assistantJson={assistantJson}
          csrf={serialString(assistantCsrf)}
        />
      </Suspense>
    </div>
  );
}
