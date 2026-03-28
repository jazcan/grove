import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shopifyInstallations } from "@/db/schema";
import { getShopifyEnv } from "@/lib/shopify-config";
import { normalizeShopParam } from "@/lib/shopify-shop";

function verifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(hmacHeader, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const cfg = getShopifyEnv();
  if (!cfg) {
    return NextResponse.json({ error: "Shopify is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  if (!verifyWebhookHmac(rawBody, hmac, cfg.apiSecret)) {
    return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });
  }

  const topic = request.headers.get("X-Shopify-Topic") ?? "";
  try {
    JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (topic === "app/uninstalled") {
    const headerShop = request.headers.get("X-Shopify-Shop-Domain");
    const shop = headerShop ? normalizeShopParam(headerShop) : null;
    if (shop) {
      const db = getDb();
      await db
        .update(shopifyInstallations)
        .set({
          accessTokenEnc: null,
          uninstalledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shopifyInstallations.shop, shop));
    }
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
