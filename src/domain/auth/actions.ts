"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { getDb } from "@/db";
import {
  users,
  providers,
  emailVerificationTokens,
  passwordResetTokens,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateToken, hashToken } from "@/lib/crypto-token";
import { createSession, destroySession } from "@/lib/session";
import { validateCsrfToken } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { sendEmail, appUrl } from "@/lib/email";
import { isAdminEmail } from "@/lib/env";
import { isSafeInternalPath } from "@/lib/safe-internal-path";
import { logAudit } from "@/lib/audit";
import { brand } from "@/config/brand";
import { allocateUniqueReferralCode } from "@/domain/local-ambassador/referral-code";
import { tryRecordReferralOnSignup } from "@/domain/local-ambassador/referral-lifecycle";
import { REFERRAL_COOKIE_NAME } from "@/lib/local-ambassador-cookie";

export type ActionState = { error?: string; success?: string } | undefined;

async function requireCsrf(formData: FormData): Promise<boolean> {
  const t = formData.get("csrf")?.toString();
  return validateCsrfToken(t);
}

export async function signUp(prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireCsrf(formData))) return { error: "Invalid security token. Refresh the page." };
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, "signup"), 5, 60 * 60 * 1000);
  if (!rl.ok) return { error: `Too many sign-ups. Try again in ${rl.retryAfterSec}s.` };

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  if (!email.includes("@") || email.length > 320) return { error: "Invalid email." };
  if (password.length < 10) return { error: "Password must be at least 10 characters." };

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await hashPassword(password);
  const admin = isAdminEmail(email);
  const userId = globalThis.crypto.randomUUID();

  const formRef = formData.get("referralCode")?.toString() ?? "";
  const cookieStore = await cookies();
  const cookieRef = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? "";
  const rawReferralCode = formRef.trim() || cookieRef || "";

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email,
      passwordHash,
      role: admin ? "admin" : "provider",
    });
    if (!admin) {
      const username = `prov-${randomBytes(6).toString("hex")}`;
      const referralCode = await allocateUniqueReferralCode(tx);
      const [created] = await tx
        .insert(providers)
        .values({
          userId,
          username,
          displayName: "New provider",
          referralCode,
        })
        .returning({ id: providers.id });
      await tryRecordReferralOnSignup(tx, {
        newUserId: userId,
        newProviderId: created!.id,
        rawReferralCode,
      });
    }
  });

  cookieStore.delete(REFERRAL_COOKIE_NAME);

  const raw = generateToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: email,
    subject: `Verify your ${brand.appName} account`,
    html: `<p>Verify your email: <a href="${link}">${link}</a></p>`,
    text: `Verify your email: ${link}`,
  });

  await logAudit({
    actorUserId: userId,
    actorType: "user",
    tenantProviderId: null,
    entityType: "user",
    entityId: userId,
    action: "signup",
    metadata: { email },
  });

  await createSession(userId);
  if (admin) redirect("/admin");
  redirect("/dashboard/onboarding");
}

export async function signIn(prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireCsrf(formData))) return { error: "Invalid security token. Refresh the page." };
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, "login"), 20, 15 * 60 * 1000);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const nextRaw = formData.get("next")?.toString() ?? "";
  const next = nextRaw && isSafeInternalPath(nextRaw) ? nextRaw : "";
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!row) return { error: "Invalid email or password." };
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  await destroySession();
  await createSession(row.id);

  await logAudit({
    actorUserId: row.id,
    actorType: "user",
    tenantProviderId: null,
    entityType: "user",
    entityId: row.id,
    action: "login",
  });

  if (next) redirect(next);
  if (row.role === "admin") redirect("/admin");
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const { getSessionUser } = await import("@/lib/session");
  const u = await getSessionUser();
  await destroySession();
  if (u) {
    await logAudit({
      actorUserId: u.id,
      actorType: "user",
      tenantProviderId: u.providerId,
      entityType: "user",
      entityId: u.id,
      action: "logout",
    });
  }
  redirect("/login");
}

export async function requestPasswordReset(
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireCsrf(formData))) return { error: "Invalid security token." };
  const ip = await getRequestIp();
  const rl = rateLimit(clientKey(ip, "pwreset"), 5, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Too many requests." };

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const db = getDb();
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (row) {
    const raw = generateToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await db.insert(passwordResetTokens).values({
      userId: row.id,
      tokenHash: hashToken(raw),
      expiresAt,
    });
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(raw)}`;
    await sendEmail({
      to: email,
      subject: `Reset your ${brand.appName} password`,
      html: `<p><a href="${link}">Reset password</a></p>`,
      text: link,
    });
  }

  return { success: "If an account exists for that email, we sent reset instructions." };
}

export async function resetPassword(prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireCsrf(formData))) return { error: "Invalid security token." };
  const token = formData.get("token")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  if (password.length < 10) return { error: "Password must be at least 10 characters." };

  const db = getDb();
  const tokenHash = hashToken(token);
  const [tok] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tok || tok.usedAt || tok.expiresAt < new Date()) {
    return { error: "Invalid or expired reset link." };
  }

  const [handoffUser] = await db
    .select({
      isSeededAccount: users.isSeededAccount,
      handoffStatus: users.handoffStatus,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, tok.userId))
    .limit(1);

  const completeSeededHandoff =
    handoffUser?.isSeededAccount === true && handoffUser.handoffStatus === "invited";

  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
        ...(completeSeededHandoff
          ? {
              handoffStatus: "claimed" as const,
              claimedAt: now,
              emailVerifiedAt: handoffUser?.emailVerifiedAt ?? now,
            }
          : {}),
      })
      .where(eq(users.id, tok.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, tok.id));
  });

  await logAudit({
    actorUserId: tok.userId,
    actorType: "user",
    tenantProviderId: null,
    entityType: "user",
    entityId: tok.userId,
    action: "password_reset",
  });

  return { success: "Password updated. You can sign in." };
}

export async function verifyEmailToken(token: string): Promise<ActionState> {
  const db = getDb();
  const tokenHash = hashToken(token);
  const [tok] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tok || tok.usedAt || tok.expiresAt < new Date()) {
    return { error: "Invalid or expired verification link." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, tok.userId));
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tok.id));
  });

  await logAudit({
    actorUserId: tok.userId,
    actorType: "user",
    tenantProviderId: null,
    entityType: "user",
    entityId: tok.userId,
    action: "email_verified",
  });

  return { success: "Email verified." };
}
