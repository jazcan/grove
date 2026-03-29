import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, services, canonicalServiceTemplates, serviceAddOnOverrides } from "@/db/schema";
import { ensureDefaultPricingProfile } from "@/domain/pricing/ensure-default";
import { isReservedUsername } from "@/lib/reserved-usernames";
import { getCsrfTokenForForm } from "@/lib/csrf";
import type { TemplateAddOn, TemplateOutcome, TemplateStep } from "@/platform/templates/structure";
import { templateStructureSchema } from "@/platform/templates/structure";
import { BookForm } from "./book-form";

type Props = { params: Promise<{ username: string; serviceId: string }> };

/** RSC → client components must receive JSON-serializable props only (no Date, etc.). */
function serialString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export default async function PublicBookPage({ params }: Props) {
  const { username, serviceId } = await params;
  const key = username.toLowerCase();
  if (isReservedUsername(key)) notFound();

  const db = getDb();
  const [prov] = await db
    .select({
      id: providers.id,
      username: providers.username,
      businessName: providers.businessName,
      displayName: providers.displayName,
      publicProfileEnabled: providers.publicProfileEnabled,
      paymentCash: providers.paymentCash,
      paymentEtransfer: providers.paymentEtransfer,
      etransferDetails: providers.etransferDetails,
      cancellationPolicy: providers.cancellationPolicy,
    })
    .from(providers)
    .where(eq(providers.username, key))
    .limit(1);
  if (!prov?.publicProfileEnabled) notFound();

  const { tiers } = await ensureDefaultPricingProfile(db, prov.id);

  const [svcRow] = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      pricingType: services.pricingType,
      priceAmount: services.priceAmount,
      currency: services.currency,
      prepInstructions: services.prepInstructions,
      phoneRequired: services.phoneRequired,
      notesRequired: services.notesRequired,
      notesInstructions: services.notesInstructions,
      serviceLevelsEnabled: services.serviceLevelsEnabled,
      positioningTierId: services.positioningTierId,
      steps: canonicalServiceTemplates.steps,
      addOns: canonicalServiceTemplates.addOns,
      outcomes: canonicalServiceTemplates.outcomes,
    })
    .from(services)
    .leftJoin(canonicalServiceTemplates, eq(services.canonicalTemplateId, canonicalServiceTemplates.id))
    .where(
      and(eq(services.id, serviceId), eq(services.providerId, prov.id), eq(services.isActive, true))
    )
    .limit(1);
  if (!svcRow) notFound();

  const overrides = await db
    .select()
    .from(serviceAddOnOverrides)
    .where(eq(serviceAddOnOverrides.serviceId, serviceId));

  let templateSteps: TemplateStep[] = [];
  let templateOutcomes: TemplateOutcome[] = [];
  let canonicalAddOns: TemplateAddOn[] = [];
  if (svcRow.steps != null && svcRow.addOns != null && svcRow.outcomes != null) {
    const parsed = templateStructureSchema.safeParse({
      steps: svcRow.steps,
      addOns: svcRow.addOns,
      outcomes: svcRow.outcomes,
    });
    if (parsed.success) {
      templateSteps = parsed.data.steps;
      templateOutcomes = parsed.data.outcomes;
      canonicalAddOns = parsed.data.addOns;
    }
  }

  const positioningTiersAll = tiers.map((t) => ({
    id: t.id,
    label: t.label,
    multiplier: t.multiplier,
  }));
  const defaultTierId =
    svcRow.positioningTierId && positioningTiersAll.some((x) => x.id === svcRow.positioningTierId)
      ? svcRow.positioningTierId
      : positioningTiersAll[0]?.id ?? "";
  const showLevelChoice = Boolean(svcRow.serviceLevelsEnabled) && positioningTiersAll.length > 1;
  const defaultTierRow =
    positioningTiersAll.find((t) => t.id === defaultTierId) ?? positioningTiersAll[0];
  const positioningTiers = showLevelChoice
    ? positioningTiersAll
    : defaultTierRow
      ? [defaultTierRow]
      : [];

  const csrf = await getCsrfTokenForForm();
  const pricingType = svcRow.pricingType === "hourly" ? "hourly" : "fixed";

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden px-4 py-10 sm:px-5 sm:py-14"
    >
      <div className="mx-auto max-w-[min(100%,760px)]">
      <p className="text-sm font-medium">
        <Link href={`/${prov.username}`} className="ui-link inline-block max-w-full break-words">
          ← Back to profile
        </Link>
      </p>

      <header className="mt-6 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Book an appointment</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)] sm:text-[1.05rem]">
          Review what’s included and your estimated total, pick a time, add your details, and confirm.
        </p>
      </header>

      <div className="mt-10 pb-8">
        <BookForm
          csrf={serialString(csrf)}
          username={serialString(prov.username)}
          providerName={serialString(prov.businessName || prov.displayName)}
          providerPaymentCash={Boolean(prov.paymentCash)}
          providerPaymentEtransfer={Boolean(prov.paymentEtransfer)}
          providerEtransferDetails={serialString(prov.etransferDetails)}
          providerCancellationPolicy={serialString(prov.cancellationPolicy)}
          serviceId={serialString(svcRow.id)}
          serviceName={serialString(svcRow.name)}
          serviceDurationMinutes={Number(svcRow.durationMinutes) || 0}
          servicePricingType={pricingType}
          servicePriceAmount={serialString(svcRow.priceAmount)}
          serviceCurrency={serialString(svcRow.currency)}
          servicePrepInstructions={serialString(svcRow.prepInstructions)}
          pricingUsesSingleLevel={!showLevelChoice}
          phoneRequired={Boolean(svcRow.phoneRequired)}
          notesRequired={Boolean(svcRow.notesRequired)}
          notesInstructions={serialString(svcRow.notesInstructions)}
          positioningTiers={positioningTiers}
          defaultTierId={defaultTierId}
          templateSteps={templateSteps}
          templateOutcomes={templateOutcomes}
          canonicalAddOns={canonicalAddOns}
          addOnOverrides={overrides.map((o) => ({
            addOnId: o.addOnId,
            enabled: o.enabled,
            priceOverride: o.priceOverride != null ? String(o.priceOverride) : null,
          }))}
        />
      </div>
      </div>
    </main>
  );
}
