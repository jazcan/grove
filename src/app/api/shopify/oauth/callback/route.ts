import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { shopifyInstallations } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { getShopifyEnv } from "@/lib/shopify-config";
import { parseShopifyOAuthState } from "@/lib/shopify-oauth-state";
import { encryptShopifyToken } from "@/lib/shopify-token-crypto";
import { normalizeShopParam } from "@/lib/shopify-shop";

type TokenResponse = { access_token?: string; scope?: string };

export async function GET(request: NextRequest) {
  const cfg = getShopifyEnv();
  if (!cfg) {
    return NextResponse.json({ error: "Shopify is not configured." }, { status: 503 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const shopQ = request.nextUrl.searchParams.get("shop");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing OAuth parameters." }, { status: 400 });
  }

  const payload = parseShopifyOAuthState(state);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired OAuth state." }, { status: 400 });
  }

  const shop = normalizeShopParam(shopQ ?? payload.shop);
  if (!shop || shop !== payload.shop) {
    return NextResponse.json({ error: "Shop mismatch." }, { status: 400 });
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: cfg.apiKey,
      client_secret: cfg.apiSecret,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Token exchange failed.", detail: text.slice(0, 200) },
      { status: 502 }
    );
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    return NextResponse.json({ error: "No access token in response." }, { status: 502 });
  }

  const accessTokenEnc = encryptShopifyToken(data.access_token);
  const scopes = data.scope ?? cfg.scopes.join(",");
  const db = getDb();
  const now = new Date();

  await db
    .insert(shopifyInstallations)
    .values({
      shop,
      accessTokenEnc,
      scopes,
      updatedAt: now,
      uninstalledAt: null,
    })
    .onConflictDoUpdate({
      target: shopifyInstallations.shop,
      set: {
        accessTokenEnc,
        scopes,
        updatedAt: now,
        uninstalledAt: null,
      },
    });

  const appUrl = getEnv().APP_URL;
  const next = new URL("/shopify", appUrl);
  next.searchParams.set("shop", shop);
  const host = request.nextUrl.searchParams.get("host");
  if (host) next.searchParams.set("host", host);

  return NextResponse.redirect(next.toString());
}
