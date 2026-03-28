"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { signIn, type ActionState } from "@/domain/auth/actions";

type Props = { csrf: string; next?: string };

export function LoginForm({ csrf, next = "" }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5" noValidate>
      <CsrfField token={csrf} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "login-error" : undefined}
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
          autoComplete="current-password"
          required
          className="ui-input"
        />
      </div>
      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state?.error ? (
        <p id="login-error" className="sr-only">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
