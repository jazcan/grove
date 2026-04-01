import Link from "next/link";
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { brand } from "@/config/brand";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { shopifyInstallations } from "@/db/schema";
import { hashToken } from "@/lib/crypto-token";
import { getSessionUser } from "@/lib/session";
import { normalizeShopParam } from "@/lib/shopify-shop";

type Props = { searchParams: Promise<{ t?: string; shop?: string }> };

export default async function ShopifyAttachPage({ searchParams }: Props) {
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  const shopRaw = typeof sp.shop === "string" ? sp.shop : "";
  const shop = normalizeShopParam(shopRaw);

  if (!t || !shop) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-lg px-4 py-12 font-sans text-sm"
      >
        <h1 className="text-lg font-semibold">Invalid link</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          This attach link is missing parameters. Open{" "}
          <strong>Link {brand.appName} account</strong> again from the app in Shopify Admin.
        </p>
      </main>
    );
  }

  const u = await getSessionUser();
  if (!u) {
    const next = `/shopify/attach?${new URLSearchParams({ shop, t }).toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (u.role === "admin" || !u.providerId) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-lg px-4 py-12 font-sans text-sm"
      >
        <h1 className="text-lg font-semibold">Provider account required</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          Sign in with a {brand.appName} provider account (not only an admin account), complete onboarding if
          needed, then use the link from Shopify again.
        </p>
        <p className="mt-4">
          <Link href="/signup" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Create a provider account
          </Link>
        </p>
      </main>
    );
  }

  const db = getDb();
  const th = hashToken(t);
  const now = new Date();

  const [inst] = await db
    .select()
    .from(shopifyInstallations)
    .where(
      and(
        eq(shopifyInstallations.shop, shop),
        eq(shopifyInstallations.pendingAttachTokenHash, th),
        isNotNull(shopifyInstallations.pendingAttachExpiresAt),
        gt(shopifyInstallations.pendingAttachExpiresAt, now)
      )
    )
    .limit(1);

  if (!inst) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-lg px-4 py-12 font-sans text-sm"
      >
        <h1 className="text-lg font-semibold">Link expired</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          This one-time link is invalid or expired. Go back to Shopify Admin, open {brand.appName}, and choose{" "}
          <strong>Link {brand.appName} account</strong> again.
        </p>
      </main>
    );
  }

  if (inst.providerId && inst.providerId !== u.providerId) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-lg px-4 py-12 font-sans text-sm"
      >
        <h1 className="text-lg font-semibold">Already linked</h1>
        <p className="mt-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
          This Shopify store is connected to a different {brand.appName} provider. Contact support if you need
          to move the connection.
        </p>
      </main>
    );
  }

  await db
    .update(shopifyInstallations)
    .set({
      providerId: u.providerId,
      pendingAttachTokenHash: null,
      pendingAttachExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(shopifyInstallations.id, inst.id));

  redirect(`/shopify?shop=${encodeURIComponent(shop)}&attached=1`);
}
