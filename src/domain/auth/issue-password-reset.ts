import { getDb } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/crypto-token";
import { sendEmail, appUrl } from "@/lib/email";
import { brand } from "@/config/brand";

/**
 * Creates a password-reset token and emails the link. Reuses the same table and
 * `/reset-password` page as forgot-password.
 */
export async function issuePasswordResetForEmail(params: {
  userId: string;
  email: string;
}): Promise<{ rawToken: string; claimLink: string; emailSent: boolean }> {
  const db = getDb();
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await db.insert(passwordResetTokens).values({
    userId: params.userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });
  const claimLink = `${appUrl()}/reset-password?token=${encodeURIComponent(raw)}`;
  const res = await sendEmail({
    to: params.email,
    subject: `Set your ${brand.appName} password`,
    html: `<p>Use this link to set your password and access your account:</p><p><a href="${claimLink}">${claimLink}</a></p>`,
    text: claimLink,
  });
  return { rawToken: raw, claimLink, emailSent: res.ok };
}
