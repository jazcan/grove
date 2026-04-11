import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { brand } from "@/config/brand";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { loadProviderSetupState, getNextSetupStepHref } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";
import { OnboardingForm } from "@/app/dashboard/onboarding/onboarding-form";
import { OnboardingReferralPanel } from "@/components/dashboard/onboarding-referral-panel";
import { OnboardingRoadmap } from "@/components/dashboard/onboarding-roadmap";
import { providerHasReferralAttribution } from "@/domain/local-ambassador/referral-lifecycle";

export default async function OnboardingPage() {
  const u = await requireUser();
  if (u.role === "admin") redirect("/admin");
  if (!u.providerId) redirect("/login");

  const db = getDb();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const setup = await loadProviderSetupState(db, u.providerId, timezone);
  if (setup.hasIdentity) {
    redirect(getNextSetupStepHref(setup));
  }

  const hasReferralAttribution = await providerHasReferralAttribution(db, u.providerId);

  const csrf = await getCsrfTokenForForm();

  return (
    <main
      id="main-content"
      className="flex min-h-[min(100dvh,880px)] flex-col items-center overflow-x-hidden px-4 py-10 sm:py-14"
    >
      <div className="w-full max-w-[min(100%,480px)]">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to {brand.appName}</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          Let&apos;s set up your public profile.
        </p>

        <div className="ui-card mt-8 p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight">Your public identity</h2>
          <p className="ui-hint mt-2">
            Choose how you want to appear to customers, then pick a booking link.
          </p>
          <div className="mt-6">
            <OnboardingForm
              csrfToken={csrf}
              defaultUsername={prov?.username ?? ""}
              defaultDisplayName={prov?.displayName ?? ""}
            />
          </div>
        </div>

        <OnboardingRoadmap />

        {!hasReferralAttribution ? <OnboardingReferralPanel csrfToken={csrf} /> : null}
      </div>
    </main>
  );
}
