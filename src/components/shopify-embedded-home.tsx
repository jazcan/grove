"use client";

import { useCallback, useEffect, useState } from "react";
import { brand } from "@/config/brand";
import { useSearchParams } from "next/navigation";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge/utilities/session-token";

type Me = {
  shop: string;
  linked: boolean;
  providerId: string | null;
};

type Props = { apiKey: string };

export function ShopifyEmbeddedHome({ apiKey }: Props) {
  const searchParams = useSearchParams();
  const host = searchParams?.get("host") ?? "";
  const shop = searchParams?.get("shop") ?? "";
  const attached = searchParams?.get("attached") === "1";

  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const loadMe = useCallback(async () => {
    if (!host || !apiKey) return;
    setError(null);
    try {
      const app = createApp({ apiKey, host });
      const token = await getSessionToken(app);
      const res = await fetch("/api/shopify/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as Me & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load session.");
        return;
      }
      setMe({ shop: data.shop, linked: data.linked, providerId: data.providerId });
    } catch {
      setError("Session request failed.");
    }
  }, [apiKey, host]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const startLink = async () => {
    if (!host || !apiKey) return;
    setLinkBusy(true);
    setError(null);
    try {
      const app = createApp({ apiKey, host });
      const token = await getSessionToken(app);
      const res = await fetch("/api/shopify/prepare-attach", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not start linking.";
        setError(err);
        return;
      }
      if (data === null || typeof data !== "object") {
        setError("Could not start linking.");
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "linked" in data &&
        (data as { linked: boolean }).linked === true
      ) {
        await loadMe();
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "linked" in data &&
        (data as { linked: boolean }).linked === false &&
        "url" in data &&
        typeof (data as { url: unknown }).url === "string"
      ) {
        const url = (data as { url: string }).url;
        if (window.top) {
          window.top.location.href = url;
        } else {
          window.location.href = url;
        }
      }
    } catch {
      setError("Link flow failed.");
    } finally {
      setLinkBusy(false);
    }
  };

  if (!host) {
    return (
      <main className="p-6 font-sans text-sm">
        <h1 className="text-lg font-semibold">{brand.appName} (Shopify)</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          Open this app from the Shopify Admin to sign in with your shop session—no separate{" "}
          {brand.appName} password required here.
        </p>
        {shop ? (
          <p className="mt-4 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
            Shop hint: {shop}
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="p-6 font-sans text-sm">
      <h1 className="text-lg font-semibold">{brand.appName}</h1>
      {attached ? (
        <p className="mt-3 rounded-md border border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-3 py-2">
          {brand.appName} account linked. Return to Shopify Admin and open {brand.appName} again if the page does not
          refresh automatically.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-md border border-[var(--error)] bg-[color-mix(in_oklab,var(--error)_12%,transparent)] px-3 py-2">
          {error}
        </p>
      ) : null}
      {me ? (
        <div className="mt-4 space-y-3">
          <p className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
            Signed in via Shopify Admin as <strong>{me.shop}</strong>.
          </p>
          {me.linked ? (
            <p>
              This shop is linked to your {brand.appName} provider. Use the full {brand.appName} site for mobile and
              public booking pages.
            </p>
          ) : (
            <div className="space-y-2">
              <p>
                Link this Shopify store to your {brand.appName} provider account (the one you use on the web).
                You will sign in to {brand.appName} once in a new tab, then return here.
              </p>
              <button
                type="button"
                disabled={linkBusy}
                onClick={() => void startLink()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {linkBusy ? "Opening…" : `Link ${brand.appName} account`}
              </button>
            </div>
          )}
        </div>
      ) : !error ? (
        <p className="mt-4 text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Loading…</p>
      ) : null}
    </main>
  );
}
