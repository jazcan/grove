"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { createCustomerManual } from "@/actions/customers";
import { CsrfField } from "@/components/csrf-field";

type OpenFn = () => void;

const AddCustomerOpenContext = createContext<OpenFn | null>(null);

export function useOpenAddCustomerModal(): OpenFn {
  const fn = useContext(AddCustomerOpenContext);
  return fn ?? (() => {});
}

export function AddCustomerModalRoot({ csrf, children }: { csrf: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(createCustomerManual, undefined);
  const open = useCallback(() => dialogRef.current?.showModal(), []);

  return (
    <AddCustomerOpenContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className="w-[min(100%,28rem)] max-w-[calc(100vw-2rem)] rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] backdrop:bg-black/40"
      >
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Add a customer</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            They&apos;ll appear in your list right away. You can add more detail later.
          </p>
        </div>

        <form action={formAction} className="grid gap-4 px-6 py-5">
          <CsrfField token={csrf} />
          {state?.error ? (
            <div
              role="alert"
              className="rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
            >
              {state.error}
            </div>
          ) : null}

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input name="fullName" required autoComplete="name" className="ui-input" placeholder="Full name" />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="ui-input"
              placeholder="name@example.com"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_80%,transparent)]">
              Phone <span className="font-normal">(optional)</span>
            </span>
            <input name="phone" type="tel" autoComplete="tel" className="ui-input" placeholder="(555) 123-4567" />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_80%,transparent)]">
              Notes <span className="font-normal">(optional)</span>
            </span>
            <textarea
              name="notes"
              rows={3}
              className="ui-textarea"
              placeholder="Anything useful to remember—only you see this."
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="ui-btn-secondary min-h-11 px-4 text-sm font-semibold"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" disabled={pending} className="ui-btn-primary min-h-11 px-5 text-sm font-semibold">
              {pending ? "Saving…" : "Save customer"}
            </button>
          </div>
        </form>
      </dialog>
    </AddCustomerOpenContext.Provider>
  );
}

export function AddCustomerModalButton({ className }: { className?: string }) {
  const open = useOpenAddCustomerModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className={
        className ?? "ui-btn-primary min-h-11 shrink-0 px-5 text-sm font-semibold"
      }
    >
      Add customer
    </button>
  );
}

export function AddCustomerEmptyButton({ className }: { className?: string }) {
  const open = useOpenAddCustomerModal();
  return (
    <button type="button" onClick={() => open()} className={className}>
      Add your first customer
    </button>
  );
}
