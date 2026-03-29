import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import { availabilityRules, bookings, providers, services } from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import {
  getServiceDefaultsForCanonicalSlug,
  listCanonicalTemplatesForUi,
} from "@/lib/canonical-templates";
import { QUICK_START_PREFILL_ID } from "@/lib/service-templates";
import { ServicesList } from "@/app/dashboard/services/services-list";
import { ServiceCreateSection } from "@/components/dashboard/service-create-section";
import { ServicePerformanceSection } from "@/components/dashboard/service-performance-section";
import { ServiceTemplatesHub } from "@/components/dashboard/service-templates-hub";

type Props = { searchParams: Promise<{ saved?: string; prefill?: string; scratch?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const saved = sp.saved === "service";
  const prefillRaw = typeof sp.prefill === "string" ? sp.prefill.trim() : undefined;
  const scratch = sp.scratch === "1" || sp.scratch === "true";

  let prefillDefaults: Awaited<ReturnType<typeof getServiceDefaultsForCanonicalSlug>> = null;
  if (scratch) {
    prefillDefaults = await getServiceDefaultsForCanonicalSlug(QUICK_START_PREFILL_ID);
  } else if (prefillRaw) {
    prefillDefaults = await getServiceDefaultsForCanonicalSlug(prefillRaw);
  }
  const formVisible = prefillDefaults !== null || scratch;

  const serviceTemplates = await listCanonicalTemplatesForUi();

  const canonicalTemplateSlug = scratch ? QUICK_START_PREFILL_ID : (prefillRaw ?? QUICK_START_PREFILL_ID);

  const u = await requireProvider();
  const db = getDb();
  const [prov] = await db
    .select({
      publicProfileEnabled: providers.publicProfileEnabled,
      username: providers.username,
      defaultServiceLevelsEnabled: providers.defaultServiceLevelsEnabled,
    })
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
      serviceLevelsEnabled: services.serviceLevelsEnabled,
      phoneRequired: services.phoneRequired,
      notesRequired: services.notesRequired,
      notesInstructions: services.notesInstructions,
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

  const statsRows =
    list.length > 0
      ? await db
          .select({
            serviceId: bookings.serviceId,
            bookingCount: count(),
            revenuePaid: sql<string>`coalesce(sum(case when ${bookings.paymentStatus} = 'paid' then ${bookings.paymentAmount}::numeric else 0 end), 0)::text`,
          })
          .from(bookings)
          .where(and(eq(bookings.providerId, u.providerId), ne(bookings.status, "cancelled")))
          .groupBy(bookings.serviceId)
      : [];

  const statsByServiceId = Object.fromEntries(
    statsRows.map((r) => [
      r.serviceId,
      { bookingCount: Number(r.bookingCount), revenuePaid: r.revenuePaid },
    ])
  );

  return (
    <main id="main-content">
      <header className="max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Pick a proven template, save, and start taking bookings—no blank page required.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
          Templates are the default path: they pre-fill name, duration, price, and client-facing copy so you only
          confirm or tweak. That cuts decision fatigue and gets you to &quot;bookable&quot; in under 30 seconds.
        </p>
        {saved ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--background))] px-4 py-3 text-sm"
          >
            <div className="font-medium">Saved</div>
            <div className="mt-0.5 text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">Your service list is up to date.</div>
          </div>
        ) : null}
      </header>

      <div className="mt-10 max-w-4xl space-y-14">
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-6 sm:p-8 md:p-10">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_48%,transparent)]">
            Start here
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Choose a template below—everything is filled in for you. Prefer a blank form? Use{" "}
            <Link href="/dashboard/services?scratch=1#service-form" className="font-medium text-[var(--accent)] underline underline-offset-2">
              create from scratch
            </Link>
            .
          </p>
          <div className="mt-12">
            <ServiceTemplatesHub templates={serviceTemplates} />
          </div>
        </section>

        <ServiceCreateSection
          csrf={csrf}
          prefillDefaults={prefillDefaults}
          formVisible={formVisible}
          scratchMode={scratch}
          canonicalTemplateSlug={canonicalTemplateSlug}
          defaultServiceLevelsEnabled={Boolean(prov?.defaultServiceLevelsEnabled)}
        />

        <ServicePerformanceSection services={list} statsByServiceId={statsByServiceId} />
      </div>

      <section id="existing-services" className="mt-20 max-w-4xl scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">{servicesHeading}</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">{servicesSubtitle}</p>
        <div className="mt-6">
          <ServicesList services={list} csrf={csrf} />
        </div>
      </section>
    </main>
  );
}
