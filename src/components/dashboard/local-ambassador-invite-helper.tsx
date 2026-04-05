"use client";

import { useCallback, useMemo, useState } from "react";
import { brand } from "@/config/brand";

type Props = {
  referralUrl: string;
};

export function LocalAmbassadorInviteHelper({ referralUrl }: Props) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    const line = `Hey! I’ve been using ${brand.appName} to run my services business and it’s made things a lot easier. If you want to check it out, here’s my link: ${referralUrl}`;
    return email.trim()
      ? `${line}\n\n(I thought of you: ${email.trim()})`
      : line;
  }, [referralUrl, email]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [message]);

  return (
    <div className="mt-5 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/40 p-4">
      <p className="text-sm font-medium text-[var(--foreground)]">Invite message</p>
      <p className="ui-hint mt-1 text-sm">
        Optional: add their email as a reminder for yourself, then copy friendly text to paste anywhere.
      </p>
      <label htmlFor="ambassador-invite-email" className="ui-label mt-3 block">
        Their email (optional)
      </label>
      <input
        id="ambassador-invite-email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ui-input mt-1 w-full max-w-md"
        placeholder="friend@example.com"
      />
      <button type="button" onClick={onCopy} className="ui-btn-secondary mt-3 text-sm">
        {copied ? "Copied" : "Copy invite message"}
      </button>
    </div>
  );
}
