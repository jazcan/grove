"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { signUp, type ActionState } from "@/domain/auth/actions";

type Props = { csrf: string };

export function SignupForm({ csrf }: Props) {
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
      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
