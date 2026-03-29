import Link from "next/link";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { GroveLogoMark } from "@/components/brand/grove-logo-mark";
import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { DashboardOnboardingAssistant } from "@/components/dashboard/onboarding-assistant";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";

const DASHBOARD_NAV_LINKS = [
  ["/dashboard", "Home"],
  ["/dashboard/services", "Services"],
  ["/dashboard/pricing", "Pricing"],
  ["/dashboard/availability", "Availability"],
  ["/dashboard/bookings", "Bookings"],
  ["/dashboard/customers", "Customers"],
  ["/dashboard/marketing", "Marketing"],
  ["/dashboard/analytics", "Analytics"],
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await requireUser();

  let setupState: Awaited<ReturnType<typeof loadProviderSetupState>> | null = null;
  let setupLoadFailed = false;
  const preProvider = !u.providerId;
  if (u.providerId) {
    try {
      const db = getDb();
      const [prov] = await db
        .select({ timezone: providers.timezone })
        .from(providers)
        .where(eq(providers.id, u.providerId))
        .limit(1);
      const tz = prov?.timezone ?? "America/Toronto";
      setupState = await loadProviderSetupState(db, u.providerId, tz);
    } catch (e) {
      console.error("[dashboard layout] failed to load provider setup", e);
      setupLoadFailed = true;
    }
  }

  const initialExpanded = setupLoadFailed ? true : (setupState?.needsSetup ?? true);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_88%,transparent)]">
        <div
          className="mx-auto grid max-w-5xl gap-x-3 gap-y-3 px-4 py-4
            grid-cols-[1fr_auto]
            [grid-template-areas:'logo_account'_'nav_nav']
            sm:grid-cols-[auto_minmax(0,1fr)_auto]
            sm:[grid-template-areas:'logo_nav_account']
            sm:items-center"
        >
          <Link
            href="/dashboard"
            className="[grid-area:logo] flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]"
          >
            <GroveLogoMark size={32} className="shrink-0" />
            <span className="text-[var(--accent)]">Grove</span>
          </Link>
          <div className="[grid-area:account] justify-self-end self-center">
            <DashboardAccountMenu userEmail={u.email} />
          </div>
          <nav
            className="[grid-area:nav] flex min-w-0 flex-wrap gap-x-1 gap-y-2 text-sm font-medium sm:gap-x-0.5"
            aria-label="Dashboard"
          >
            {DASHBOARD_NAV_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-2.5 py-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)] sm:px-3"
              >
                {label}
              </Link>
            ))}
          </nav>
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
        />
      </Suspense>
    </div>
  );
}
