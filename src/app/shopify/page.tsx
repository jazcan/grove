import { Suspense } from "react";
import { ShopifyEmbeddedHome } from "@/components/shopify-embedded-home";
import { getShopifyEnv } from "@/lib/shopify-config";

export default function ShopifyAppPage() {
  const cfg = getShopifyEnv();
  if (!cfg) {
    return (
      <main className="mx-auto max-w-lg p-6 font-sans text-sm">
        <h1 className="text-lg font-semibold">Shopify</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          Set <code className="rounded bg-[var(--border)] px-1">SHOPIFY_API_KEY</code> and{" "}
          <code className="rounded bg-[var(--border)] px-1">SHOPIFY_API_SECRET</code> to enable the
          embedded app.
        </p>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="p-6 font-sans text-sm text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
          Loading…
        </main>
      }
    >
      <ShopifyEmbeddedHome apiKey={cfg.apiKey} />
    </Suspense>
  );
}
