import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

export const CSRF_COOKIE = "grove_csrf";

/** Internal header set by middleware so RSC can read the raw CSRF value in the same request as Set-Cookie. */
export const CSRF_RAW_HEADER = "x-grove-csrf-raw";

export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24,
};

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqualB64Url(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(sig);
}

export function createCsrfTokenValue(): string {
  const u = new Uint8Array(24);
  crypto.getRandomValues(u);
  return base64UrlEncode(u.buffer);
}

async function sign(value: string): Promise<string> {
  const secret = getEnv().CSRF_SECRET;
  const mac = await hmacSha256Base64Url(secret, value);
  return `${value}.${mac}`;
}

async function verify(signed: string): Promise<string | null> {
  const secret = getEnv().CSRF_SECRET;
  const lastDot = signed.lastIndexOf(".");
  if (lastDot < 0) return null;
  const value = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = await hmacSha256Base64Url(secret, value);
  if (!timingSafeEqualB64Url(sig, expected)) return null;
  return value;
}

/** Never throws — RSC and actions must not crash if env/cookie is misconfigured or stale. */
async function verifySafe(signed: string): Promise<string | null> {
  try {
    return await verify(signed);
  } catch {
    return null;
  }
}

/**
 * Prepare CSRF for an incoming request (middleware). Sets request header for RSC;
 * returns a signed cookie value to set on the response when a new token was minted.
 */
export async function prepareCsrfForRequest(request: NextRequest): Promise<{
  requestHeaders: Headers;
  signedCookieToSet: string | null;
}> {
  const requestHeaders = new Headers(request.headers);
  let signedCookieToSet: string | null = null;
  try {
    const existing = request.cookies.get(CSRF_COOKIE)?.value;
    let raw = existing ? await verifySafe(existing) : null;
    if (!raw) {
      raw = createCsrfTokenValue();
      signedCookieToSet = await sign(raw);
    }
    requestHeaders.set(CSRF_RAW_HEADER, raw);
  } catch {
    /* CSRF_SECRET / env missing — leave header unset */
  }
  return { requestHeaders, signedCookieToSet };
}

/** Raw token for embedding in forms (read-only in RSC; cookie is set in middleware). */
export async function getCsrfTokenForForm(): Promise<string> {
  const h = await headers();
  const fromMiddleware = h.get(CSRF_RAW_HEADER);
  if (fromMiddleware) return fromMiddleware;

  const store = await cookies();
  const cookieSigned = store.get(CSRF_COOKIE)?.value;
  if (!cookieSigned) return "";
  return (await verifySafe(cookieSigned)) ?? "";
}

export async function validateCsrfToken(formToken: string | undefined): Promise<boolean> {
  if (!formToken) return false;
  const store = await cookies();
  const cookieSigned = store.get(CSRF_COOKIE)?.value;
  if (!cookieSigned) return false;
  const cookieRaw = await verifySafe(cookieSigned);
  if (!cookieRaw) return false;
  return timingSafeEqualB64Url(formToken, cookieRaw);
}
