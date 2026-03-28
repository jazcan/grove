import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { getEnv } from "@/lib/env";

export type ShopifyEnv = {
  apiKey: string;
  apiSecret: string;
  scopes: string[];
};

export function getShopifyEnv(): ShopifyEnv | null {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim();
  const scopesRaw = process.env.SHOPIFY_SCOPES?.trim() || "read_products";
  if (!apiKey || !apiSecret) return null;
  const scopes = scopesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { apiKey, apiSecret, scopes: scopes.length ? scopes : ["read_products"] };
}

let shopifyInstance: ReturnType<typeof shopifyApi> | null = null;

export function getShopify() {
  const s = getShopifyEnv();
  if (!s) {
    throw new Error("Shopify is not configured (SHOPIFY_API_KEY / SHOPIFY_API_SECRET).");
  }
  if (!shopifyInstance) {
    const appUrl = getEnv().APP_URL;
    const url = new URL(appUrl);
    shopifyInstance = shopifyApi({
      apiKey: s.apiKey,
      apiSecretKey: s.apiSecret,
      scopes: s.scopes,
      hostName: url.host,
      hostScheme: url.protocol === "https:" ? "https" : "http",
      apiVersion: ApiVersion.October25,
      isEmbeddedApp: true,
    });
  }
  return shopifyInstance;
}
