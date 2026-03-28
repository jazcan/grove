import type { NextRequest } from "next/server";
import { getShopify, getShopifyEnv } from "@/lib/shopify-config";
import { shopFromSessionDest } from "@/lib/shopify-shop";

export type ShopifySessionClaims = {
  shop: string;
  shopifyUserId: string;
};

/**
 * Validates App Bridge session token and returns the normalized shop hostname.
 */
export async function getShopifySessionFromRequest(
  request: NextRequest
): Promise<ShopifySessionClaims | null> {
  if (!getShopifyEnv()) return null;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const shopify = getShopify();
    const payload = await shopify.session.decodeSessionToken(token);
    const shop = shopFromSessionDest(payload.dest);
    if (!shop) return null;
    return { shop, shopifyUserId: payload.sub };
  } catch {
    return null;
  }
}
