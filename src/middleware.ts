import { NextResponse, type NextRequest } from "next/server";
import {
  CSRF_COOKIE,
  CSRF_COOKIE_OPTIONS,
  prepareCsrfForRequest,
} from "@/lib/csrf";
import { normalizeReferralCodeInput } from "@/domain/local-ambassador/referral-code";
import { REFERRAL_COOKIE_MAX_AGE_SEC, REFERRAL_COOKIE_NAME } from "@/lib/local-ambassador-cookie";

export async function middleware(request: NextRequest) {
  const { requestHeaders, signedCookieToSet } = await prepareCsrfForRequest(request);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (signedCookieToSet) {
    res.cookies.set(CSRF_COOKIE, signedCookieToSet, CSRF_COOKIE_OPTIONS);
  }

  const pathname = request.nextUrl.pathname;
  const refRaw = request.nextUrl.searchParams.get("ref");
  if (pathname === "/signup" && refRaw) {
    const normalized = normalizeReferralCodeInput(refRaw);
    if (normalized.length >= 6) {
      res.cookies.set(REFERRAL_COOKIE_NAME, normalized, {
        path: "/",
        maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  if (pathname === "/for-providers" || pathname === "/for-providers/") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.hash = "faq";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/shopify")) {
    res.headers.set(
      "Content-Security-Policy",
      "frame-ancestors https://admin.shopify.com https://*.myshopify.com;"
    );
  } else {
    res.headers.set("X-Frame-Options", "DENY");
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
