import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, services, canonicalServiceTemplates } from "@/db/schema";
import {
  ProviderAboutSection,
  ProviderBottomCta,
  ProviderDetailsSection,
  ProviderProfileHeader,
  ProviderPublicLinks,
  ProviderServiceCard,
  IntentPlanner,
} from "@/components/public-profile";
import {
  buildProviderLocationLine,
  providerDisplayInitials,
  providerHeroTeaser,
  publicProfileImageUrl,
} from "@/lib/public-profile-helpers";
import { isReservedUsername } from "@/lib/reserved-usernames";

type Props = { params: Promise<{ username: string }> };

function primaryCtaForServices(username: string, active: { service: { id: string } }[]) {
  if (active.length === 0) return null;
  if (active.length === 1) {
    return { href: `/${username}/book/${active[0]!.service.id}`, label: "Book now" as const };
  }
  return { href: `/${username}#services`, label: "View services" as const };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const key = username.toLowerCase();
  if (isReservedUsername(key)) notFound();

  const db = getDb();
  const [prov] = await db.select().from(providers).where(eq(providers.username, key)).limit(1);
  if (!prov || !prov.publicProfileEnabled) notFound();

  const svcList = await db
    .select({
      service: services,
      templateOutcomes: canonicalServiceTemplates.outcomes,
    })
    .from(services)
    .leftJoin(canonicalServiceTemplates, eq(services.canonicalTemplateId, canonicalServiceTemplates.id))
    .where(eq(services.providerId, prov.id))
    .orderBy(asc(services.sortOrder), asc(services.name));

  const activeServices = svcList.filter((row) => row.service.isActive);
  const primaryCta = primaryCtaForServices(prov.username, activeServices);
  const avatarUrl = publicProfileImageUrl(prov.profileImageKey);
  const locationLine = buildProviderLocationLine(prov.city, prov.serviceArea);
  const heroTeaser = providerHeroTeaser(prov.businessName ?? "", prov.bio);
  const initials = providerDisplayInitials(prov.displayName);
  const bioTrim = prov.bio.trim();
  const teaserFromBioOnly = !(prov.businessName?.trim());
  const hideAboutAsDuplicate = teaserFromBioOnly && bioTrim.length > 0 && bioTrim === (heroTeaser ?? "").trim() && !prov.bio.includes("\n");

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden bg-[var(--background)] pb-16 pt-8 sm:pb-20 sm:pt-10"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ProviderProfileHeader
          displayName={prov.displayName}
          category={prov.category}
          locationLine={locationLine}
          heroTeaser={heroTeaser}
          avatarUrl={avatarUrl}
          initials={initials}
          primaryCta={primaryCta}
        />

        <ProviderPublicLinks
          websiteUrl={prov.websiteUrl}
          socialFacebookUrl={prov.socialFacebookUrl}
          socialInstagramUrl={prov.socialInstagramUrl}
          socialYoutubeUrl={prov.socialYoutubeUrl}
          socialTiktokUrl={prov.socialTiktokUrl}
        />

        <IntentPlanner
          username={prov.username}
          services={activeServices.map((row) => ({
            id: row.service.id,
            name: row.service.name,
            durationMinutes: row.service.durationMinutes,
          }))}
        />

        <section id="services" className="scroll-mt-28 sm:scroll-mt-32" aria-labelledby="services-heading">
          <div className="mt-10 sm:mt-12">
            <h2 id="services-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              {prov.displayName.trim() ? `${prov.displayName.trim()} Services` : "Services"}
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Choose a service to see its description, price, and open times — then finish your booking.
            </p>
          </div>

          {activeServices.length === 0 ? (
            <div
              className="mt-6 rounded-2xl bg-[var(--card)] px-6 py-12 text-center shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:px-10 sm:py-14"
              role="status"
            >
              <p className="text-lg font-semibold text-[var(--foreground)]">No services listed yet</p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                This page is live, but there are no bookable sessions here right now. Please check back soon.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
              {activeServices.map((row) => {
                const s = row.service;
                const outcomes = Array.isArray(row.templateOutcomes)
                  ? row.templateOutcomes.map((o) => (typeof o?.label === "string" ? o.label : "")).filter(Boolean)
                  : [];
                return (
                  <ProviderServiceCard
                    key={s.id}
                    username={prov.username}
                    service={{
                      id: s.id,
                      name: s.name,
                      description: s.description,
                      durationMinutes: s.durationMinutes,
                      pricingType: s.pricingType,
                      priceAmount: String(s.priceAmount),
                      currency: s.currency,
                      outcomeTeasers: outcomes.slice(0, 3),
                    }}
                  />
                );
              })}
            </ul>
          )}
        </section>

        <ProviderAboutSection bio={hideAboutAsDuplicate ? "" : prov.bio} displayName={prov.displayName} />

        <ProviderDetailsSection
          city={prov.city}
          serviceArea={prov.serviceArea}
          contactEmail={prov.contactEmail}
          contactPhone={prov.contactPhone}
          paymentCash={prov.paymentCash}
          paymentEtransfer={prov.paymentEtransfer}
          paymentInPersonCreditDebit={prov.paymentInPersonCreditDebit}
          etransferDetails={prov.etransferDetails}
          paymentDueBeforeAppointment={prov.paymentDueBeforeAppointment}
          cancellationPolicy={prov.cancellationPolicy}
        />

        <ProviderBottomCta
          username={prov.username}
          serviceCount={activeServices.length}
          singleServiceId={activeServices.length === 1 ? activeServices[0]!.service.id : undefined}
        />
      </div>
    </main>
  );
}
