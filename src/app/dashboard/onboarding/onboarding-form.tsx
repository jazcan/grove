"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/actions/provider-profile";
import { CsrfField } from "@/components/csrf-field";

type Props = {
  csrfToken: string;
  defaultUsername: string;
  defaultDisplayName: string;
};

export function OnboardingForm({ csrfToken, defaultUsername, defaultDisplayName }: Props) {
  const [state, formAction, pending] = useActionState(completeOnboarding, null);

  return (
    <form action={formAction} className="space-y-5">
      <CsrfField token={csrfToken} />
      <div className="ui-field">
        <label htmlFor="username" className="ui-label">
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={defaultUsername}
          required
          autoComplete="username"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "onboarding-error username-hint" : "username-hint"}
          className="ui-input"
          pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
          title="Lowercase letters, numbers, hyphens. 3–64 characters."
          placeholder="your-name"
        />
        <p id="username-hint" className="ui-hint">
          Lowercase letters, numbers, and hyphens only. This becomes your public profile where clients can
          book you.
        </p>
      </div>
      <div className="ui-field">
        <label htmlFor="displayName" className="ui-label">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={defaultDisplayName}
          required
          autoComplete="name"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "onboarding-error" : undefined}
          className="ui-input"
          placeholder="How customers see you"
        />
      </div>

      {state?.error ? (
        <div id="onboarding-error" className="ui-alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Saving…" : "Continue"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        You can add services and availability next.
      </p>
    </form>
  );
}
