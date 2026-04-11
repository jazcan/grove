import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireUser } from "@/lib/tenancy";
import { OnboardingCustomersClient } from "@/components/dashboard/setup/onboarding-customers-client";

export default async function OnboardingCustomersPage() {
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

  if (!setup.hasIdentity) redirect("/dashboard/onboarding");
  if (!setup.hasServices) redirect("/dashboard/onboarding/first-service");
  if (!setup.hasAvailability) redirect("/dashboard/availability?onboarding=1");
  if (setup.onboardingWalkthroughCompletedAt) {
    redirect("/dashboard");
  }
  if (setup.customerCount > 0) {
    redirect("/dashboard/onboarding/share");
  }

  const csrf = await getCsrfTokenForForm();

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[min(100dvh,880px)] max-w-[min(100%,720px)] flex-col px-4 py-10 sm:py-14"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Step 4 of setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Add people you already know
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          Optional but helpful: import or add a few customers so follow-ups stay in one place. Nothing is sent
          automatically.
        </p>
      </header>

      <div className="mt-8">
        <OnboardingCustomersClient
          csrf={csrf}
          successContinueHref="/dashboard/onboarding/share"
          successContinueLabel="Continue"
          successSecondaryHref="/dashboard/customers"
          successSecondaryLabel="View customer list"
        />
      </div>

      <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href="/dashboard/onboarding/share"
          className="ui-btn-primary inline-flex min-h-11 items-center justify-center px-5 text-center text-sm font-semibold no-underline"
        >
          Skip for now — share ideas
        </Link>
        <Link
          href="/dashboard/customers/import"
          className="text-sm font-semibold text-[var(--accent)] underline underline-offset-2"
        >
          Full CSV import wizard
        </Link>
      </div>
    </main>
  );
}
