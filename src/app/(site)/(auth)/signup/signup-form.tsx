"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { signUp, type ActionState } from "@/domain/auth/actions";

type Props = { csrf: string; initialReferralCode: string };

export function SignupForm({ csrf, initialReferralCode }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signUp, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5" noValidate>
      <CsrfField token={csrf} />
      {state?.error ? (
        <div className="ui-alert-error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="ui-field">
        <label htmlFor="email" className="ui-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="ui-input"
        />
      </div>
      <div className="ui-field">
        <label htmlFor="password" className="ui-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="ui-input"
        />
        <p id="password-hint" className="ui-hint">
          At least 10 characters.
        </p>
      </div>
      <div className="ui-field">
        <label htmlFor="referralCode" className="ui-label">
          Referral code <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <input
          id="referralCode"
          name="referralCode"
          type="text"
          autoComplete="off"
          defaultValue={initialReferralCode}
          className="ui-input"
          placeholder="From a Local Ambassador link or friend"
        />
        <p className="ui-hint">
          This is who invited you. We’ll connect your accounts so you can refer each other and stay in touch.
        </p>
      </div>
      <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
        You can change anything later. Nothing is locked in.
      </p>
      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Getting set up…" : "Get set up"}
      </button>
    </form>
  );
}
