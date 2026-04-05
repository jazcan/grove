"use client";

import { useActionState } from "react";
import { createInvoiceFromBooking } from "@/actions/invoices";
import { CsrfField } from "@/components/csrf-field";

type InvoiceState = Awaited<ReturnType<typeof createInvoiceFromBooking>>;

async function invoiceAction(_prev: InvoiceState | undefined, formData: FormData): Promise<InvoiceState> {
  return createInvoiceFromBooking(formData);
}

export function BookingInvoiceForm({ csrf, bookingId }: { csrf: string; bookingId: string }) {
  const [state, formAction] = useActionState(invoiceAction, undefined as InvoiceState | undefined);

  const invoiceId = state && "invoiceId" in state ? state.invoiceId : undefined;

  return (
    <div className="mt-4">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <CsrfField token={csrf} />
        <input type="hidden" name="bookingId" value={bookingId} />
        <button type="submit" className="ui-btn-secondary min-h-10 px-4 text-sm font-semibold">
          Create invoice from booking
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">{state.success}</p>
      ) : null}
      {invoiceId ? (
        <p className="mt-3 text-sm">
          <a
            href={`/api/invoices/${invoiceId}/pdf`}
            className="ui-link font-semibold"
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
          <span className="text-[color-mix(in_oklab,var(--foreground)_45%,transparent)]"> · </span>
          <a href={`/api/invoices/${invoiceId}`} className="ui-link" target="_blank" rel="noreferrer">
            View JSON
          </a>
        </p>
      ) : null}
    </div>
  );
}
