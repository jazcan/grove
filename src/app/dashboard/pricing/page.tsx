import { eq, asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  canonicalServiceTemplates,
  pricingProfiles,
  providerDiscountCodes,
  serviceAddOnOverrides,
  services,
} from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import { PricingSimulator } from "@/components/dashboard/pricing-simulator";
import { PositioningTiersForm, PricingProfileForm } from "./pricing-forms";
import { AddOnOverrideRows } from "./add-on-override-rows";
import { DiscountCodesPanel } from "./discount-codes-panel";

export default async function PricingPage() {
  const u = await requireProvider();
  const db = getDb();
  const { profileId, tiers } = await ensureDefaultPricingProfile(db, u.providerId);
  const [profile] = await db.select().from(pricingProfiles).where(eq(pricingProfiles.id, profileId)).limit(1);

  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      priceAmount: services.priceAmount,
      pricingType: services.pricingType,
      currency: services.currency,
      canonicalAddOns: canonicalServiceTemplates.addOns,
    })
    .from(services)
    .leftJoin(canonicalServiceTemplates, eq(services.canonicalTemplateId, canonicalServiceTemplates.id))
    .where(eq(services.providerId, u.providerId))
    .orderBy(asc(services.sortOrder));

  const ids = serviceRows.map((r) => r.id);
  const overrides =
    ids.length > 0
      ? await db.select().from(serviceAddOnOverrides).where(inArray(serviceAddOnOverrides.serviceId, ids))
      : [];

  const byService: Record<string, { addOnId: string; enabled: boolean; priceOverride: string | null }[]> = {};
  for (const o of overrides) {
    const list = byService[o.serviceId] ?? [];
    list.push({
      addOnId: o.addOnId,
      enabled: o.enabled,
      priceOverride: o.priceOverride != null ? String(o.priceOverride) : null,
    });
    byService[o.serviceId] = list;
  }

  const csrf = await getCsrfTokenForForm();

  const simulatorServices = serviceRows.map((r) => ({
    id: r.id,
    name: r.name,
    priceAmount: String(r.priceAmount),
    pricingType: r.pricingType,
    currency: r.currency,
    canonicalAddOns: r.canonicalAddOns,
  }));

  const tierRows = tiers.map((t) => ({
    id: t.id,
    label: t.label,
    multiplier: t.multiplier,
    sortOrder: t.sortOrder,
  }));

  const discountRows = await db
    .select({
      id: providerDiscountCodes.id,
      code: providerDiscountCodes.code,
      discountPercent: providerDiscountCodes.discountPercent,
      oneTimeUse: providerDiscountCodes.oneTimeUse,
      redeemedAt: providerDiscountCodes.redeemedAt,
    })
    .from(providerDiscountCodes)
    .where(eq(providerDiscountCodes.providerId, u.providerId))
    .orderBy(asc(providerDiscountCodes.createdAt));

  return (
    <main id="main-content" className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
          Set currency, tune optional add-ons from your templates, and share discount codes—keep the core path simple.
        </p>
      </header>

      {profile ? (
        <PricingProfileForm
          profile={{ name: profile.name, currency: profile.currency }}
          csrf={csrf}
        />
      ) : null}

      <DiscountCodesPanel
        csrf={csrf}
        rows={discountRows.map((r) => ({
          id: r.id,
          code: r.code,
          discountPercent: Number(r.discountPercent),
          oneTimeUse: r.oneTimeUse,
          redeemedAt: r.redeemedAt,
        }))}
      />

      <AddOnOverrideRows services={simulatorServices} overrides={byService} csrf={csrf} />

      <details className="group rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--card))] open:shadow-[var(--shadow-card)]">
        <summary className="cursor-pointer list-none px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Advanced: service levels & simulator</h2>
              <p className="mt-1 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
                Optional—edit tier labels and multipliers, or try what a booking total might look like with add-ons.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] group-open:hidden">
              Show
            </span>
            <span className="hidden shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[color-mix(in_oklab,var(--foreground)_70%,transparent)] group-open:inline-block">
              Hide
            </span>
          </div>
        </summary>
        <div className="space-y-10 border-t border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] px-5 pb-8 pt-6 sm:px-6">
          <PositioningTiersForm tiers={tierRows} csrf={csrf} />
          <PricingSimulator services={simulatorServices} tiers={tiers} overrideByService={byService} />
        </div>
      </details>
    </main>
  );
}
