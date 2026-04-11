import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { brand } from "@/config/brand";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { loadProviderSetupState, getNextSetupStepHref } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";
import { FirstServiceOnboardingForm } from "@/app/dashboard/onboarding/first-service/first-service-form";

export default async function FirstServiceOnboardingPage() {
  const u = await requireUser();
  if (u.role === "admin") redirect("/admin");
  if (!u.providerId) redirect("/login");

  const db = getDb();
  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const setup = await loadProviderSetupState(db, u.providerId, timezone);

  if (!setup.hasIdentity) {
    redirect("/dashboard/onboarding");
  }
  if (setup.hasServices) {
    redirect(getNextSetupStepHref(setup));
  }

  const csrf = await getCsrfTokenForForm();

  return (
    <main
      id="main-content"
      className="flex min-h-[min(100dvh,880px)] flex-col items-center overflow-x-hidden px-4 py-10 sm:py-14"
    >
      <div className="w-full max-w-[min(100%,480px)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Step 2 of setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Add one thing people can book</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          A single service is enough to turn on your calendar. {brand.appName} uses the same data here as on your full
          Services page—nothing duplicate.
        </p>

        <div className="ui-card mt-8 p-6 sm:p-7">
          <FirstServiceOnboardingForm csrfToken={csrf} />
        </div>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          <Link href="/dashboard" className="font-medium text-[var(--accent)] underline underline-offset-2">
            Back to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
