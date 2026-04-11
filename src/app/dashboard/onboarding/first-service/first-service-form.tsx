"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createServiceFromActionState } from "@/actions/services";
import { CsrfField } from "@/components/csrf-field";
import { ServiceDurationVariantsFields } from "@/components/dashboard/service-duration-variants-fields";
import { QUICK_START_PREFILL_ID } from "@/lib/service-templates";

type Props = {
  csrfToken: string;
};

export function FirstServiceOnboardingForm({ csrfToken }: Props) {
  const [state, formAction, pending] = useActionState(createServiceFromActionState, null);

  return (
    <form action={formAction} className="space-y-6">
      <CsrfField token={csrfToken} />
      <input type="hidden" name="returnTo" value="/dashboard/availability?onboarding=1" />
      <input type="hidden" name="canonicalTemplateSlug" value={QUICK_START_PREFILL_ID} />

      <div className="ui-field">
        <label htmlFor="first-svc-name" className="ui-label">
          What are you offering?
        </label>
        <input
          id="first-svc-name"
          name="name"
          required
          autoComplete="off"
          className="ui-input"
          placeholder="e.g. Haircut, Home visit, Intro call"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "first-svc-error name-hint" : "name-hint"}
        />
        <p id="name-hint" className="ui-hint">
          Clients see this on your booking page. You can change it anytime under Services.
        </p>
      </div>

      <div className="ui-field">
        <label htmlFor="first-svc-description" className="ui-label">
          Short description <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <textarea
          id="first-svc-description"
          name="description"
          rows={3}
          className="ui-textarea"
          placeholder="What should someone expect from this booking?"
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-[var(--foreground)]">Duration &amp; price</div>
        <p className="ui-hint mt-1">
          You can add more options or change currency later in Services.
        </p>
        <div className="mt-4">
          <ServiceDurationVariantsFields
            initialRow={{
              durationMinutes: 60,
              bufferMinutes: 0,
              priceAmount: "50.00",
            }}
          />
        </div>
      </div>

      <input type="hidden" name="currency" value="CAD" />

      {state?.error ? (
        <div id="first-svc-error" className="ui-alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="ui-btn-primary w-full">
        {pending ? "Saving…" : "Continue to availability"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Need templates or advanced settings?{" "}
        <Link href="/dashboard/services" className="font-semibold text-[var(--accent)] underline underline-offset-2">
          Open full services
        </Link>
      </p>
    </form>
  );
}
