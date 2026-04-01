import { Resend } from "resend";
import { defaultEmailFromLabel } from "@/config/brand";
import { getEnv } from "@/lib/env";

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? defaultEmailFromLabel;

  if (!key) {
    console.info("[email:dev]", { to: input.to, subject: input.subject });
    return { ok: true };
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export function appUrl(): string {
  return getEnv().APP_URL;
}
