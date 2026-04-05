"use client";

import { useActionState } from "react";
import { applyReferralCode } from "@/actions/local-ambassador";
import { CsrfField } from "@/components/csrf-field";
import type { ActionState } from "@/domain/auth/actions";

type Props = { csrfToken: string };

export function OnboardingReferralPanel({ csrfToken }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(applyReferralCode, undefined);

  return (
    <div className="ui-card mt-8 p-6 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight">Were you invited by another provider?</h2>
      <p className="ui-hint mt-2">
        If someone shared a Local Ambassador link or code with you, enter it here. This is optional and can be
        skipped.
      </p>
      <form action={action} className="mt-5 space-y-4">
        <CsrfField token={csrfToken} />
        <div className="ui-field">
          <label htmlFor="onboarding-referral-code" className="ui-label">
            Referral code
          </label>
          <input
            id="onboarding-referral-code"
            name="referralCode"
            className="ui-input"
            autoComplete="off"
            placeholder="e.g. ABC123XYZ4"
            aria-invalid={state?.error ? true : undefined}
          />
        </div>
        {state?.error ? (
          <div className="ui-alert-error" role="alert">
            {state.error}
          </div>
        ) : null}
        {state?.success ? (
          <div className="ui-alert-success" role="status">
            {state.success}
          </div>
        ) : null}
        <button type="submit" disabled={pending} className="ui-btn-secondary w-full sm:w-auto">
          {pending ? "Saving…" : "Apply referral code"}
        </button>
      </form>
    </div>
  );
}
