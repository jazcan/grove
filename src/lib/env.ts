import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  CSRF_SECRET: z.string().min(16).optional(),
  /** Prefer full URL; bare host (e.g. `app.example.com`) is normalized in `resolvePublicAppUrl`. */
  APP_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  FEATURE_AI_GATEWAY: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** OpenAI for marketing reconnect drafts only (optional). */
  OPENAI_API_KEY: z.string().optional(),
  MARKETING_OPENAI_MODEL: z.string().optional(),
  /** When "true", optional rephrase of deterministic Ask replies (requires OPENAI_API_KEY). */
  ASSISTANT_OPENAI_REPHRASE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  ASSISTANT_OPENAI_MODEL: z.string().optional(),
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SHOPIFY_SCOPES: z.string().optional(),
});

export type Env = z.infer<typeof envSchema> & {
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  APP_URL: string;
};

let cached: Env | null = null;

/**
 * Public site URL for links, CSRF, OAuth. Uses APP_URL when set; on Vercel falls back to VERCEL_URL
 * so production works even if APP_URL was not added to the project env.
 */
export function resolvePublicAppUrl(rawAppUrl: string | undefined): string | undefined {
  const trimmed = rawAppUrl?.trim();
  if (trimmed) {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      console.error("[env] APP_URL is not a valid URL:", trimmed);
      return undefined;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return undefined;
}

/** Validates secrets required for auth/session operations */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }
  const d = parsed.data;
  const sessionSecret = d.SESSION_SECRET;
  const csrfSecret = d.CSRF_SECRET;
  const appUrl = resolvePublicAppUrl(d.APP_URL);
  if (!sessionSecret || !csrfSecret || !appUrl) {
    throw new Error(
      "SESSION_SECRET and CSRF_SECRET are required. Set APP_URL to your public site URL (e.g. https://your-domain.com). On Vercel, VERCEL_URL is used if APP_URL is omitted."
    );
  }
  cached = { ...d, SESSION_SECRET: sessionSecret, CSRF_SECRET: csrfSecret, APP_URL: appUrl };
  return cached;
}

/**
 * Absolute origin when `APP_URL` / `VERCEL_URL` are used without request context.
 * For **share/copy links** shown to providers, prefer {@link getPublicSiteOriginForUserFacingLinks}
 * in server components so the incoming host (e.g. a custom domain on Vercel) wins when `APP_URL` is unset.
 *
 * Prefer `APP_URL` / `VERCEL_URL` via {@link resolvePublicAppUrl} so the page can render even when
 * `getEnv()` is not yet valid (e.g. partial `.env.local`). Falls back to `getEnv().APP_URL`, then
 * localhost in development.
 */
export function getPublicAppUrlForDashboardLinks(): string {
  const fromProcess = resolvePublicAppUrl(process.env.APP_URL);
  if (fromProcess) {
    return fromProcess.replace(/\/$/, "");
  }
  try {
    return getEnv().APP_URL.replace(/\/$/, "");
  } catch {
    if (process.env.NODE_ENV === "development") {
      const port = process.env.PORT ?? "3000";
      console.warn(
        `[env] Using http://localhost:${port} for dashboard links. Set APP_URL (and SESSION_SECRET, CSRF_SECRET) in .env.local — see .env.example.`
      );
      return `http://localhost:${port}`;
    }
    throw new Error(
      "Set APP_URL (or rely on VERCEL_URL on Vercel), SESSION_SECRET, and CSRF_SECRET. See .env.example."
    );
  }
}

export function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const set = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return set.has(email.toLowerCase());
}
