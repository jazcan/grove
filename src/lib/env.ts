import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  CSRF_SECRET: z.string().min(16).optional(),
  APP_URL: z.string().url().optional(),
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
  const appUrl = d.APP_URL;
  if (!sessionSecret || !csrfSecret || !appUrl) {
    throw new Error("SESSION_SECRET, CSRF_SECRET, and APP_URL are required");
  }
  cached = { ...d, SESSION_SECRET: sessionSecret, CSRF_SECRET: csrfSecret, APP_URL: appUrl };
  return cached;
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
