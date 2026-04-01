import Link from "next/link";
import { brand } from "@/config/brand";
import { MarketplaceMapPreview } from "@/components/marketplace/marketplace-map-preview";
import { MarketplaceSearchPanel } from "@/components/marketplace/marketplace-search-panel";
import { ProviderMarketplaceCard } from "@/components/marketplace/provider-marketplace-card";
import { marketplacePinPosition } from "@/lib/marketplace-map-layout";
import { searchDiscoverableProviders } from "@/lib/marketplace-search";

type Props = { searchParams: Promise<{ q?: string; city?: string; category?: string }> };

export default async function MarketplacePage({ searchParams }: Props) {
  const sp = await searchParams;
  let results: Awaited<ReturnType<typeof searchDiscoverableProviders>> = [];
  let directoryUnavailable = false;
  try {
    results = await searchDiscoverableProviders({
      q: sp.q,
      city: sp.city,
      category: sp.category,
      limit: 50,
    });
  } catch (err) {
    console.error("[marketplace] searchDiscoverableProviders failed", err);
    directoryUnavailable = true;
  }

  const markers = results.map((p, i) => ({
    username: p.username,
    displayName: p.displayName,
    ...marketplacePinPosition(p.username, i),
  }));

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden bg-[var(--background)] pb-14 pt-10 sm:pb-16 sm:pt-12 lg:pb-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Marketplace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Find a provider
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Search for providers by service or location, then view their profile to book.
          </p>
        </header>

        <div className="mt-8 sm:mt-10">
          <MarketplaceSearchPanel defaultQ={sp.q} defaultCity={sp.city} defaultCategory={sp.category} />
        </div>

        {directoryUnavailable ? (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-[color-mix(in_oklab,var(--error)_28%,var(--border))] bg-[color-mix(in_oklab,var(--error)_6%,var(--card))] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)] sm:px-5"
          >
            <p className="font-semibold">We couldn&apos;t load the provider directory.</p>
            <p className="mt-1 text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
              This is usually a database connection issue on the server. If you deploy {brand.appName}, add{" "}
              <code className="rounded bg-[color-mix(in_oklab,var(--foreground)_6%,var(--card))] px-1 py-0.5 text-xs">
                DATABASE_URL
              </code>{" "}
              in your hosting environment (e.g. Vercel project settings) and redeploy.
            </p>
          </div>
        ) : null}

        <section className="mt-10 sm:mt-12 lg:mt-14" aria-labelledby="results-heading">
          <div className="mb-5 flex flex-col gap-1 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="results-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                Results
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {directoryUnavailable
                  ? "Directory unavailable."
                  : results.length === 0
                    ? "Try a different search."
                    : `${results.length} provider${results.length === 1 ? "" : "s"} found`}
              </p>
            </div>
            <Link href="/signup" className="ui-link mt-2 text-sm font-semibold sm:mt-0">
              Start offering your services on {brand.appName}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(280px,380px)] lg:items-start lg:gap-10">
            <div className="min-w-0">
              {results.length === 0 ? (
                <div
                  className="rounded-2xl bg-[var(--card)] px-6 py-12 text-center shadow-[0_8px_30px_-12px_rgba(28,27,25,0.12),0_2px_8px_-4px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:px-10 sm:py-14"
                  role="status"
                >
                  <p className="mx-auto max-w-md text-lg font-semibold leading-snug text-[var(--foreground)]">
                    {directoryUnavailable
                      ? "Provider list could not be loaded."
                      : "No providers found. Try adjusting your search."}
                  </p>
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                    {directoryUnavailable
                      ? "Check server logs or DATABASE_URL configuration, then try again."
                      : "Broader keywords, another city, or a different category often helps."}
                  </p>
                </div>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:gap-7">
                    {results.map((p) => (
                      <ProviderMarketplaceCard key={p.username} p={p} />
                    ))}
                  </ul>
                  {results.length < 4 ? (
                    <p className="mt-8 rounded-xl bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 py-3 text-center text-sm leading-relaxed text-[var(--muted)] ring-1 ring-[color-mix(in_oklab,var(--accent)_18%,transparent)]">
                      More providers are coming soon. Try a different search or check back later.
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="min-w-0">
              <MarketplaceMapPreview markers={markers} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
