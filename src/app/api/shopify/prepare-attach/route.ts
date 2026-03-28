import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shopifyInstallations } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { generateToken, hashToken } from "@/lib/crypto-token";
import { getShopifySessionFromRequest } from "@/lib/shopify-session";

const ATTACH_TTL_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await getShopifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: shopifyInstallations.id,
      providerId: shopifyInstallations.providerId,
      uninstalledAt: shopifyInstallations.uninstalledAt,
    })
    .from(shopifyInstallations)
    .where(eq(shopifyInstallations.shop, session.shop))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Installation not found." }, { status: 404 });
  }

  if (row.uninstalledAt) {
    return NextResponse.json({ error: "App uninstalled." }, { status: 410 });
  }

  if (row.providerId) {
    return NextResponse.json({ linked: true as const, providerId: row.providerId });
  }

  const plain = generateToken();
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + ATTACH_TTL_MS);

  await db
    .update(shopifyInstallations)
    .set({
      pendingAttachTokenHash: tokenHash,
      pendingAttachExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(shopifyInstallations.id, row.id));

  const appUrl = getEnv().APP_URL;
  const url = new URL("/shopify/attach", appUrl);
  url.searchParams.set("shop", session.shop);
  url.searchParams.set("t", plain);

  return NextResponse.json({ linked: false as const, url: url.toString() });
}

export const dynamic = "force-dynamic";
