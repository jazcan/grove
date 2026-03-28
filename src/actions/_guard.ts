import { validateCsrfToken } from "@/lib/csrf";
import { requireProvider, requireAdmin } from "@/lib/tenancy";
import type { SessionUser } from "@/lib/session";
import { headers } from "next/headers";

type CsrfOkMeta = {
  action?: string;
};

export async function csrfOk(fd?: FormData | null, meta?: CsrfOkMeta): Promise<boolean> {
  if (!(fd instanceof FormData)) {
    let h: Record<string, string | null> | undefined;
    try {
      const hdrs = await headers();
      h = {
        referer: hdrs.get("referer"),
        origin: hdrs.get("origin"),
        userAgent: hdrs.get("user-agent"),
      };
    } catch {
      // ignore: headers() can throw outside request context
    }

    console.error("[csrfOk] Missing/invalid FormData", {
      action: meta?.action ?? "unknown",
      receivedType: fd === null ? "null" : typeof fd,
      headers: h,
      stack: new Error().stack,
    });
    return false;
  }

  return validateCsrfToken(fd.get("csrf")?.toString());
}

export async function loadProviderContext(): Promise<
  SessionUser & { providerId: string }
> {
  return requireProvider();
}

export { requireAdmin };
