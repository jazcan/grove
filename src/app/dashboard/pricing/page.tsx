import { eq, asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  canonicalServiceTemplates,
  pricingProfiles,
  serviceAddOnOverrides,
  services,
} from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { recommendListPrice } from "@/domain/pricing/engine";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import { PricingSimulator } from "@/components/dashboard/pricing-simulator";
import { PositioningTiersForm, PricingProfileForm } from "./pricing-forms";
import { AddOnOverrideRows } from "./add-on-override-rows";

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
      positioningTierId: services.positioningTierId,
      canonicalAddOns: canonicalServiceTemplates.addOns,
      templateListPrice: canonicalServiceTemplates.priceAmount,
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

  const mult0 = Number(tierRows[0]?.multiplier ?? 1);
  const recommendations = serviceRows.map((r) => {
    const base = r.templateListPrice != null ? String(r.templateListPrice) : String(r.priceAmount);
    return {
      serviceId: r.id,
      name: r.name,
      suggested: recommendListPrice({ templateBasePrice: base, tierMultiplier: mult0 }),
      currency: r.currency,
    };
  });

  return (
    <main id="main-content" className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 max-w-prose text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
          Profiles and positioning tiers attach to your template-based services. List prices live on each service;
          tiers scale what you charge for a given positioning level.
        </p>
      </header>

      {profile ? (
        <PricingProfileForm
          profile={{ name: profile.name, currency: profile.currency }}
          csrf={csrf}
        />
      ) : null}

      <PositioningTiersForm tiers={tierRows} csrf={csrf} />

      {recommendations.length > 0 ? (
        <section className="ui-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Suggestions</h2>
          <p className="ui-hint mt-2 max-w-prose">
            Suggested list price at your first tier (Standard) from the template default—adjust on each service as
            needed.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {recommendations.map((r) => (
              <li key={r.serviceId} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] py-2 last:border-0">
                <span className="font-medium text-[var(--foreground)]">{r.name}</span>
                <span className="tabular-nums text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
                  {r.currency}{" "}
                  {r.suggested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PricingSimulator services={simulatorServices} tiers={tiers} overrideByService={byService} />

      <AddOnOverrideRows services={simulatorServices} overrides={byService} csrf={csrf} />
    </main>
  );
}
