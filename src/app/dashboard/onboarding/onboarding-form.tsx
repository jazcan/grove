"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { completeOnboarding, previewOnboardingIdentity } from "@/actions/provider-profile";
import { CsrfField } from "@/components/csrf-field";
import { isProvisionalProviderUsername } from "@/lib/provider-onboarding-identity";
import { isValidUsername } from "@/lib/reserved-usernames";

type Props = {
  csrfToken: string;
  defaultUsername: string;
  defaultDisplayName: string;
};

type DnUiStatus = "idle" | "checking" | "available" | "taken";

export function OnboardingForm({ csrfToken, defaultUsername, defaultDisplayName }: Props) {
  const [state, formAction, pending] = useActionState(completeOnboarding, null);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const usernameTouchedRef = useRef(
    Boolean(defaultUsername && !isProvisionalProviderUsername(defaultUsername))
  );
  const [username, setUsername] = useState(() => {
    if (defaultUsername && !isProvisionalProviderUsername(defaultUsername)) {
      return defaultUsername.trim().toLowerCase();
    }
    return "";
  });
  const [dnStatus, setDnStatus] = useState<DnUiStatus>(() =>
    defaultDisplayName.trim() ? "checking" : "idle"
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [alternates, setAlternates] = useState<string[]>([]);
  const previewGenRef = useRef(0);

  useEffect(() => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setDnStatus("idle");
      setPreviewError(null);
      setAlternates([]);
      if (!usernameTouchedRef.current) setUsername("");
      return;
    }

    setDnStatus("checking");
    setPreviewError(null);
    const gen = ++previewGenRef.current;
    const t = window.setTimeout(async () => {
      const fd = new FormData();
      fd.set("csrf", csrfToken);
      fd.set("displayName", displayName);
      try {
        const res = await previewOnboardingIdentity(fd);
        if (gen !== previewGenRef.current) return;
        if (!res.ok) {
          setPreviewError(res.error);
          setDnStatus("idle");
          setAlternates([]);
          return;
        }
        if (!res.displayNameAvailable) {
          setDnStatus("taken");
          setAlternates([]);
          return;
        }
        setDnStatus("available");
        setAlternates(res.alternates);
        if (!usernameTouchedRef.current && res.suggestedUsername) {
          setUsername(res.suggestedUsername);
        }
      } catch {
        if (gen !== previewGenRef.current) return;
        setPreviewError("Could not check availability. Try again.");
        setDnStatus("idle");
        setAlternates([]);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [displayName, csrfToken]);

  const showUsername = displayName.trim().length > 0;
  const usernameNorm = username.trim().toLowerCase();
  const usernameOk = isValidUsername(usernameNorm);
  const canContinue =
    !pending &&
    dnStatus === "available" &&
    showUsername &&
    usernameOk &&
    !previewError;

  const displayStatusId = "onboarding-display-status";

  return (
    <form action={formAction} className="space-y-5">
      <CsrfField token={csrfToken} />

      <div className="ui-field">
        <label htmlFor="displayName" className="ui-label">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
          aria-invalid={dnStatus === "taken" || !!state?.error ? true : undefined}
          aria-describedby={
            state?.error
              ? `onboarding-error ${displayStatusId}`
              : showUsername
                ? displayStatusId
                : undefined
          }
          className="ui-input"
          placeholder="How customers see you"
        />
        <p id={displayStatusId} className="ui-hint mt-1.5 min-h-[1.25rem]" aria-live="polite">
          {previewError ? (
            <span className="text-[var(--error)]">{previewError}</span>
          ) : dnStatus === "idle" && !displayName.trim() ? (
            "This is the name on your public profile. It must be unique."
          ) : dnStatus === "checking" ? (
            <span className="text-[var(--muted)]">Checking availability…</span>
          ) : dnStatus === "available" ? (
            <span className="font-medium text-[var(--success)]">Available</span>
          ) : dnStatus === "taken" ? (
            <span className="font-medium text-[var(--error)]">Already in use — try a different name</span>
          ) : null}
        </p>
      </div>

      {showUsername ? (
        <div className="ui-field">
          <label htmlFor="username" className="ui-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => {
              usernameTouchedRef.current = true;
              setUsername(e.target.value);
            }}
            required
            autoComplete="username"
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? "onboarding-error username-hint" : "username-hint"}
            className="ui-input"
            pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
            title="Lowercase letters, numbers, hyphens. 3–64 characters."
            placeholder="your-booking-link"
          />
          <p id="username-hint" className="ui-hint">
            Lowercase letters, numbers, and hyphens only. This becomes your public profile where clients can
            book you.
          </p>
          {alternates.length > 0 ? (
            <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs">
              <div className="font-medium text-[var(--foreground)]">Other available links</div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {alternates.map((a) => (
                  <li key={a}>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                      onClick={() => {
                        usernameTouchedRef.current = true;
                        setUsername(a);
                      }}
                    >
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {state?.error ? (
        <div id="onboarding-error" className="ui-alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <button type="submit" disabled={!canContinue} className="ui-btn-primary w-full">
        {pending ? "Saving…" : "Continue"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Next you&apos;ll add one bookable service, then availability and publishing.
      </p>
    </form>
  );
}
