import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers, services } from "@/db/schema";
import { isReservedUsername } from "@/lib/reserved-usernames";
import { getCsrfTokenForForm } from "@/lib/csrf";
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

  const [svc] = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      pricingType: services.pricingType,
      priceAmount: services.priceAmount,
      currency: services.currency,
      prepInstructions: services.prepInstructions,
    })
    .from(services)
    .where(
      and(eq(services.id, serviceId), eq(services.providerId, prov.id), eq(services.isActive, true))
    )
    .limit(1);
  if (!svc) notFound();

  const csrf = await getCsrfTokenForForm();
  const pricingType = svc.pricingType === "hourly" ? "hourly" : "fixed";

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
          You’ll choose a time, add your details, and confirm — it only takes a minute.
        </p>
      </header>

      <div className="mt-10 pb-8">
        <BookForm
          csrf={serialString(csrf)}
          username={serialString(prov.username)}
          providerName={serialString(prov.businessName || prov.displayName)}
          providerUsername={serialString(prov.username)}
          providerPaymentCash={Boolean(prov.paymentCash)}
          providerPaymentEtransfer={Boolean(prov.paymentEtransfer)}
          providerEtransferDetails={serialString(prov.etransferDetails)}
          providerCancellationPolicy={serialString(prov.cancellationPolicy)}
          serviceId={serialString(svc.id)}
          serviceName={serialString(svc.name)}
          serviceDurationMinutes={Number(svc.durationMinutes) || 0}
          servicePricingType={pricingType}
          servicePriceAmount={serialString(svc.priceAmount)}
          serviceCurrency={serialString(svc.currency)}
          servicePrepInstructions={serialString(svc.prepInstructions)}
        />
      </div>
      </div>
    </main>
  );
}
