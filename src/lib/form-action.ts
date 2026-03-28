import type { ActionState } from "@/domain/auth/actions";

/** React's `<form action>` type expects `Promise<void>`; our server actions return `ActionState`. */
export function asFormAction(
  fn: (formData: FormData) => Promise<ActionState>
): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}
