import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shopifyInstallations } from "@/db/schema";
import { getShopifySessionFromRequest } from "@/lib/shopify-session";

export async function GET(request: NextRequest) {
  const session = await getShopifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select({
      providerId: shopifyInstallations.providerId,
      uninstalledAt: shopifyInstallations.uninstalledAt,
    })
    .from(shopifyInstallations)
    .where(eq(shopifyInstallations.shop, session.shop))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Installation not found. Complete OAuth first." }, { status: 404 });
  }

  if (row.uninstalledAt) {
    return NextResponse.json({ error: "App uninstalled for this shop." }, { status: 410 });
  }

  return NextResponse.json({
    shop: session.shop,
    shopifyUserId: session.shopifyUserId,
    linked: Boolean(row.providerId),
    providerId: row.providerId,
  });
}

export const dynamic = "force-dynamic";
