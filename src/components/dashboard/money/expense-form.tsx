"use client";

import { useFormStatus } from "react-dom";
import { addExpenseRecord } from "@/actions/money";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { EXPENSE_CATEGORIES } from "@/platform/enums";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ui-btn-primary mt-4 min-h-10 px-4 text-sm font-semibold" disabled={pending}>
      {pending ? "Saving…" : "Save expense"}
    </button>
  );
}

export function ExpenseForm({ csrf }: { csrf: string }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={asFormAction(addExpenseRecord)} className="mt-4 max-w-md space-y-3 text-sm">
      <CsrfField token={csrf} />
      <label className="ui-field block">
        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Amount (CAD)</span>
        <input name="amount" type="text" inputMode="decimal" className="ui-input mt-1" placeholder="0.00" required />
      </label>
      <label className="ui-field block">
        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Category</span>
        <select name="category" className="ui-input mt-1" required defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="ui-field block">
        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Description (optional)</span>
        <input name="description" type="text" className="ui-input mt-1" maxLength={2000} />
      </label>
      <label className="ui-field block">
        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Date</span>
        <input name="incurredAt" type="date" className="ui-input mt-1" required defaultValue={today} />
      </label>
      <SubmitButton />
    </form>
  );
}
