import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { getPublicSiteOriginForUserFacingLinks } from "@/lib/server/public-site-origin";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";
import { OnboardingShareClient } from "@/app/dashboard/onboarding/share/onboarding-share-client";

export default async function OnboardingSharePage() {
  const u = await requireUser();
  if (u.role === "admin") redirect("/admin");
  if (!u.providerId) redirect("/login");

  const db = getDb();
  const [prov] = await db
    .select({
      timezone: providers.timezone,
      username: providers.username,
      displayName: providers.displayName,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const setup = await loadProviderSetupState(db, u.providerId, timezone);

  if (!setup.hasIdentity) redirect("/dashboard/onboarding");
  if (!setup.hasServices) redirect("/dashboard/onboarding/first-service");
  if (!setup.hasAvailability) redirect("/dashboard/availability?onboarding=1");
  if (setup.onboardingWalkthroughCompletedAt) {
    redirect("/dashboard");
  }

  const csrf = await getCsrfTokenForForm();
  const appUrl = await getPublicSiteOriginForUserFacingLinks();
  const profileUrl = prov?.username ? `${appUrl}/${prov.username}` : appUrl;

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[min(100dvh,880px)] max-w-[min(100%,560px)] flex-col px-4 py-10 sm:py-14"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Step 5 · Suggested</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Share your link when you&apos;re ready</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          Copy what you like and send it yourself—no messages go out from this screen.
        </p>
      </header>

      <div className="mt-8">
        <OnboardingShareClient csrf={csrf} profileUrl={profileUrl} displayName={prov?.displayName ?? ""} />
      </div>
    </main>
  );
}
