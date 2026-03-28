"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { requestPasswordReset, type ActionState } from "@/domain/auth/actions";

type Props = { csrf: string };

export function ForgotPasswordForm({ csrf }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    undefined
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <CsrfField token={csrf} />
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
        <label htmlFor="email" className="ui-label">
          Email
        </label>
        <input id="email" name="email" type="email" required className="ui-input" />
      </div>
      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
