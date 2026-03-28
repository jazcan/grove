"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { resetPassword, type ActionState } from "@/domain/auth/actions";

type Props = { csrf: string; token: string };

export function ResetPasswordForm({ csrf, token }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPassword, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <CsrfField token={csrf} />
      <input type="hidden" name="token" value={token} />
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
      <div className="ui-field">
        <label htmlFor="password" className="ui-label">
          New password
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
      </div>
      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
