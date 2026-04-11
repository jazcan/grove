"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  completeOnboardingWalkthroughAction,
  recordOnboardingSharePromptViewed,
} from "@/actions/onboarding-walkthrough";
import { CsrfField } from "@/components/csrf-field";
import { CopyPublicProfileUrlButton } from "@/components/dashboard/copy-public-profile-url-button";
import { brand } from "@/config/brand";

type Props = {
  csrf: string;
  profileUrl: string;
  displayName: string;
};

export function OnboardingShareClient({ csrf, profileUrl, displayName }: Props) {
  const [state, formAction, pending] = useActionState(completeOnboardingWalkthroughAction, null);
  const [viewLogged, setViewLogged] = useState(false);

  useEffect(() => {
    if (viewLogged) return;
    let cancelled = false;
    (async () => {
      const fd = new FormData();
      fd.set("csrf", csrf);
      const r = await recordOnboardingSharePromptViewed(fd);
      if (!cancelled && r.ok) setViewLogged(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [csrf, viewLogged]);

  const shortName = displayName.trim().split(/\s+/)[0] || "there";

  const messages = useMemo(
    () => [
      {
        id: "sms",
        title: "Short text / SMS",
        body: `Hey! You can book time with me here: ${profileUrl}`,
      },
      {
        id: "neighbor",
        title: "Neighborhood or social post",
        body: `I’m taking bookings through ${brand.appName} — same-day and weekly spots when I can. Here’s my page: ${profileUrl}`,
      },
      {
        id: "existing",
        title: "Existing clients",
        body: `Hi${shortName === "there" ? "" : ` ${shortName}`}, I moved my scheduling online so it’s easier to grab a time. Here’s my booking page: ${profileUrl}`,
      },
    ],
    [profileUrl, shortName]
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const onCopyMessage = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="space-y-8">
      {state?.error ? (
        <div role="alert" className="ui-alert-error">
          {state.error}
        </div>
      ) : null}

      <section className="ui-card p-6 sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">Your booking link</h2>
        <p className="ui-hint mt-2">
          When your public profile is on, this is the page clients use. Copy it anytime from the dashboard too.
        </p>
        <div className="mt-4 break-all rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
          {profileUrl}
        </div>
        <CopyPublicProfileUrlButton
          url={profileUrl}
          className="ui-btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center px-5 text-sm font-semibold sm:w-auto"
        >
          Copy link
        </CopyPublicProfileUrlButton>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Ready-to-send messages</h2>
        <p className="ui-hint mt-2 max-w-prose">
          Pick one, copy, and send when you like—through your own text app or email. {brand.appName} does not send these
          for you.
        </p>
        <ul className="mt-6 space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
              <div className="text-sm font-semibold text-[var(--foreground)]">{m.title}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                {m.body}
              </p>
              <button
                type="button"
                className="ui-btn-secondary mt-3 min-h-10 px-4 text-sm font-semibold"
                onClick={() => onCopyMessage(m.id, m.body)}
              >
                {copiedId === m.id ? "Copied" : "Copy message"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:flex-wrap sm:items-center">
        <form action={formAction} className="contents">
          <CsrfField token={csrf} />
          <button type="submit" disabled={pending} className="ui-btn-primary min-h-11 px-6 text-sm font-semibold">
            {pending ? "Saving…" : "Go to dashboard"}
          </button>
        </form>
        <Link href="/dashboard/profile" className="text-center text-sm font-semibold text-[var(--accent)] underline underline-offset-2 sm:text-left">
          Publish or edit profile first
        </Link>
      </div>
    </div>
  );
}
