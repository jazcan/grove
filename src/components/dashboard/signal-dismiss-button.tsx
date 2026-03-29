"use client";

import { useFormStatus } from "react-dom";

export function SignalDismissButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="ui-btn-secondary min-h-10 shrink-0 px-4 py-2 text-sm font-semibold"
      disabled={pending}
    >
      {pending ? "Dismissing…" : "Dismiss"}
    </button>
  );
}
