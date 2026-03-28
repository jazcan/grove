import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import { availabilityRules, providers, services } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import {
  formatTemplateDurationPrice,
  getServiceDefaultsForPrefill,
  serviceTemplates,
  templateCardTitle,
} from "@/lib/service-templates";
import { ServicesList } from "@/app/dashboard/services/services-list";
import { ServiceCreateSection } from "@/components/dashboard/service-create-section";

type Props = { searchParams: Promise<{ saved?: string; prefill?: string; scratch?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const saved = sp.saved === "service";
  const prefillRaw = typeof sp.prefill === "string" ? sp.prefill.trim() : undefined;
  const scratch = sp.scratch === "1" || sp.scratch === "true";
  const prefillDefaults = getServiceDefaultsForPrefill(prefillRaw);
  const formVisible = prefillDefaults !== null || scratch;

  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select({ publicProfileEnabled: providers.publicProfileEnabled, username: providers.username })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const list = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      category: services.category,
      durationMinutes: services.durationMinutes,
      bufferMinutes: services.bufferMinutes,
      pricingType: services.pricingType,
      priceAmount: services.priceAmount,
      currency: services.currency,
      prepInstructions: services.prepInstructions,
      isActive: services.isActive,
    })
    .from(services)
    .where(eq(services.providerId, u.providerId))
    .orderBy(asc(services.sortOrder), asc(services.name));

  const [anyRule] = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, u.providerId))
    .limit(1);

  const hasServices = list.length > 0;
  const hasAvailability = !!anyRule;
  const published = !!prov?.publicProfileEnabled;
  const nextHref = !hasAvailability ? "/dashboard/availability" : "/dashboard/profile";
  const nextLabel = !hasAvailability ? "Next: set availability" : published ? "View your public profile" : "Next: publish profile";

  const csrf = await getCsrfTokenForForm();

  const readyForBookings = hasServices && published && hasAvailability;
  const servicesHeading = readyForBookings
    ? "You're ready to accept bookings"
    : "Your services";
  const servicesSubtitle = readyForBookings
    ? "Clients can book what you offer below. Edit anytime as your business grows."
    : hasServices
      ? "What clients book—you can edit details anytime."
      : "When you add a service, it appears here for you to manage.";

  return (
    <main id="main-content">
      <header className="max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Create and manage what customers can book.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
          Most providers start with one simple service and adjust it later.
        </p>
        {saved ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--background))] px-4 py-3 text-sm"
          >
            <div className="font-medium">Saved</div>
            <div className="mt-0.5 text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
              Your service list is up to date.
            </div>
          </div>
        ) : null}
      </header>

      <div className="mt-16 max-w-4xl space-y-16">
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-6 sm:p-8 md:p-10">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
            Add a service
          </p>
          <div className="mt-10" aria-labelledby="quick-start-heading">
            <div className="rounded-2xl border-2 border-[color-mix(in_oklab,var(--accent)_32%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_9%,var(--card))] p-6 shadow-[0_8px_28px_-16px_rgba(28,27,25,0.12)] sm:p-8">
              <h2 id="quick-start-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                Start with a simple service
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)] sm:text-base">
                We&apos;ll fill in the basics—name, time, and price—so you only need to review and save.
              </p>
              <Link
                href="/dashboard/services?prefill=simple#service-form"
                className="ui-btn-primary mt-8 inline-flex min-h-12 min-w-[min(100%,220px)] items-center justify-center px-8 text-base font-semibold shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
              >
                Create a basic service
              </Link>
            </div>
          </div>

          <section className="mt-14 sm:mt-16" aria-labelledby="templates-heading">
            <h2 id="templates-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
              Start with something simple
            </h2>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
              Pick a template and adjust it to fit your work.
            </p>

            <ul className="mt-10 grid grid-cols-1 gap-7 sm:gap-8 md:grid-cols-2">
              {serviceTemplates.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-6 shadow-[0_10px_36px_-22px_rgba(28,27,25,0.2)] transition-shadow duration-200 hover:shadow-[0_16px_40px_-20px_rgba(28,27,25,0.22)] sm:p-7"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold leading-snug text-[var(--foreground)] sm:text-xl">
                      {templateCardTitle(t)}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-[var(--accent)] sm:text-[0.9375rem]">
                      {formatTemplateDurationPrice(t.service)}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                      {t.descriptionShort}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/services?prefill=${encodeURIComponent(t.id)}#service-form`}
                    className="ui-btn-primary mt-8 inline-flex min-h-12 w-full items-center justify-center px-6 text-sm font-semibold sm:px-10"
                  >
                    Use template
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <ServiceCreateSection
          csrf={csrf}
          prefillDefaults={prefillDefaults}
          formVisible={formVisible}
          scratchMode={scratch}
        />

        <div className="max-w-4xl rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Setup step: Services</div>
              <div className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                Add at least one service customers can book.
              </div>
            </div>
            <div className="text-sm">
              <span className="mr-2 inline-block w-4 text-center" aria-hidden>
                {hasServices ? "✓" : "•"}
              </span>
              {hasServices ? "Complete" : "Not done yet"}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href={nextHref} className="font-medium text-[var(--accent)] underline underline-offset-2">
              {nextLabel}
            </Link>
            {published ? (
              <Link href={`/${prov?.username}`} className="text-[var(--accent)] underline underline-offset-2">
                View public profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <section id="existing-services" className="mt-24 max-w-4xl scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">{servicesHeading}</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          {servicesSubtitle}
        </p>
        <div className="mt-6">
          <ServicesList services={list} csrf={csrf} />
        </div>
      </section>
    </main>
  );
}
