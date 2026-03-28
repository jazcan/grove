import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

type Payload = { shop: string; exp: number };

function sign(message: string): string {
  return createHmac("sha256", getEnv().CSRF_SECRET).update(message).digest("base64url");
}

export function createShopifyOAuthState(shop: string, ttlMs = 10 * 60 * 1000): string {
  const payload: Payload = { shop, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function parseShopifyOAuthState(state: string): Payload | null {
  const i = state.lastIndexOf(".");
  if (i <= 0) return null;
  const body = state.slice(0, i);
  const sig = state.slice(i + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (typeof payload.shop !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;
  return payload;
}
