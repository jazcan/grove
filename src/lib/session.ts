import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users, providers } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/crypto-token";

export const SESSION_COOKIE = "grove_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  role: "provider" | "admin";
  emailVerifiedAt: Date | null;
  providerId: string | null;
};

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[session] DATABASE_URL is not set; cannot resolve session");
    return null;
  }
  const db = getDb();
  const tokenHash = hashToken(token);
  const row = await db
    .select({
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row.length) {
    // Do not clear the cookie here: getSessionUser runs in Server Components, where
    // cookies() is read-only (Next.js). Stale cookies are harmless; explicit sign-out
    // or route handlers may still call destroySession().
    return null;
  }

  const [prov] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.userId, row[0].user.id))
    .limit(1);

  return {
    id: row[0].user.id,
    email: row[0].user.email,
    role: row[0].user.role,
    emailVerifiedAt: row[0].user.emailVerifiedAt,
    providerId: prov?.id ?? null,
  };
}
