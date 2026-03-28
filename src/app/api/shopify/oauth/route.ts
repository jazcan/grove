import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { getShopifyEnv } from "@/lib/shopify-config";
import { createShopifyOAuthState } from "@/lib/shopify-oauth-state";
import { normalizeShopParam } from "@/lib/shopify-shop";

export async function GET(request: NextRequest) {
  const cfg = getShopifyEnv();
  if (!cfg) {
    return NextResponse.json({ error: "Shopify is not configured." }, { status: 503 });
  }

  const shopRaw = request.nextUrl.searchParams.get("shop");
  if (!shopRaw) {
    return NextResponse.json({ error: "Missing shop parameter." }, { status: 400 });
  }

  const shop = normalizeShopParam(shopRaw);
  if (!shop) {
    return NextResponse.json({ error: "Invalid shop domain." }, { status: 400 });
  }

  const appUrl = getEnv().APP_URL;
  const redirectUri = `${appUrl}/api/shopify/oauth/callback`;

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", cfg.apiKey);
  url.searchParams.set("scope", cfg.scopes.join(","));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", createShopifyOAuthState(shop));

  return NextResponse.redirect(url.toString());
}
