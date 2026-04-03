"use client";

import { useActionState } from "react";
import { addProviderDiscountCode, deleteProviderDiscountCode } from "@/actions/provider-discount-codes";
import { CsrfField } from "@/components/csrf-field";
import type { ActionState } from "@/domain/auth/actions";

type Row = {
  id: string;
  code: string;
  discountPercent: number;
  oneTimeUse: boolean;
  redeemedAt: Date | null;
};

export function DiscountCodesPanel({ csrf, rows }: { csrf: string; rows: Row[] }) {
  const [addState, addAction, addPending] = useActionState(addProviderDiscountCode, undefined);

  return (
    <section className="ui-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Discount codes</h2>
      <p className="ui-hint mt-2 max-w-prose">
        Up to five codes for promotions. Each code takes a percent off the client&apos;s pre-tip total at checkout.
        One-time codes stop working after the first successful booking; reusable codes stay active until you remove them.
      </p>

      {rows.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <div>
                <span className="font-mono font-semibold text-[var(--foreground)]">{r.code}</span>
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {r.oneTimeUse ? "One-time use" : "Anyone can use"}
                  {r.redeemedAt ? " · Redeemed" : ""}
                </span>
              </div>
              <DeleteCodeForm csrf={csrf} id={r.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">No codes yet.</p>
      )}

      {rows.length < 5 ? (
        <form action={addAction} className="mt-6 grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <CsrfField token={csrf} />
          <label className="ui-field text-sm sm:col-span-1">
            <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">New code</span>
            <input name="code" className="ui-input mt-1 uppercase" placeholder="e.g. SPRING10" maxLength={32} />
          </label>
          <label className="ui-field text-sm sm:col-span-1">
            <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Percent off</span>
            <input
              name="discountPercent"
              type="number"
              min={1}
              max={50}
              step={1}
              defaultValue={10}
              className="ui-input mt-1"
              aria-label="Discount percent"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:justify-end">
            <input type="checkbox" name="oneTimeUse" className="rounded" />
            One-time use
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={addPending} className="ui-btn-primary min-h-10 px-4 text-sm font-semibold">
              {addPending ? "Adding…" : "Add code"}
            </button>
          </div>
          {addState?.error ? (
            <p className="sm:col-span-2 text-sm text-[var(--error)]" role="alert">
              {addState.error}
            </p>
          ) : null}
          {addState?.success ? (
            <p className="sm:col-span-2 text-sm text-[var(--success)]" role="status">
              {addState.success}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function DeleteCodeForm({ csrf, id }: { csrf: string; id: string }) {
  type Del = (prev: ActionState, fd: FormData) => Promise<ActionState>;
  const [state, action, pending] = useActionState(deleteProviderDiscountCode as Del, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <CsrfField token={csrf} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="ui-btn-ghost min-h-9 px-2 text-xs font-semibold text-[var(--error)]">
        Remove
      </button>
      {state?.error ? <span className="text-xs text-[var(--error)]">{state.error}</span> : null}
    </form>
  );
}
