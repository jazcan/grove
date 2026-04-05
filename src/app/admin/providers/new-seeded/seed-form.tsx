"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSeededProviderAccount,
  type SeededCreateState,
} from "@/actions/admin-seeded-providers";
import { CsrfField } from "@/components/csrf-field";

type Props = {
  csrfToken: string;
  appBaseUrl: string;
};

export function SeedProviderForm({ csrfToken, appBaseUrl }: Props) {
  const [state, formAction, pending] = useActionState(createSeededProviderAccount, undefined as SeededCreateState);

  if (state && "success" in state && state.success) {
    const publicUrl = `${appBaseUrl.replace(/\/$/, "")}/${state.username}`;
    return (
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Seeded provider account created</h2>
        <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
          Temporary login email: <span className="font-mono">{state.loginEmail}</span>
        </p>
        {state.generatedPassword ? (
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
            Auto-generated temporary password (copy now; it will not be shown again):{" "}
            <span className="font-mono font-medium">{state.generatedPassword}</span>
          </p>
        ) : null}
        <p className="text-sm">
          Public profile:{" "}
          <a href={publicUrl} className="text-[var(--accent)] underline-offset-2 hover:underline">
            {publicUrl}
          </a>
        </p>
        <p className="text-sm text-[var(--muted)]">
          Next step: open handoff when you are ready to transfer the account to the real provider.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/admin/providers/${state.providerId}/handoff`}
            className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm"
          >
            Open handoff
          </Link>
          <Link
            href="/admin/providers/seeded"
            className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm"
          >
            Seeded accounts list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <CsrfField token={csrfToken} />
      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="ui-field">
          <label htmlFor="tempEmail" className="ui-label">
            Temporary login email
          </label>
          <input
            id="tempEmail"
            name="tempEmail"
            type="email"
            required
            autoComplete="off"
            className="ui-input"
            placeholder="seed-client@example.test"
          />
        </div>
        <div className="ui-field">
          <label htmlFor="tempPassword" className="ui-label">
            Temporary password (optional)
          </label>
          <input
            id="tempPassword"
            name="tempPassword"
            type="password"
            autoComplete="new-password"
            className="ui-input"
            placeholder="Leave blank to auto-generate"
            minLength={10}
          />
          <p className="ui-hint">Minimum 10 characters if you set one manually.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="ui-field">
          <label htmlFor="displayName" className="ui-label">
            Display name
          </label>
          <input id="displayName" name="displayName" required className="ui-input" />
        </div>
        <div className="ui-field">
          <label htmlFor="businessName" className="ui-label">
            Business name
          </label>
          <input id="businessName" name="businessName" className="ui-input" />
        </div>
        <div className="ui-field">
          <label htmlFor="publicUsername" className="ui-label">
            Public username (optional)
          </label>
          <input
            id="publicUsername"
            name="publicUsername"
            className="ui-input"
            placeholder="Auto from business name if empty"
            pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
          />
          <p className="ui-hint">Lowercase letters, numbers, hyphens. Used in the public URL.</p>
        </div>
        <div className="ui-field">
          <label htmlFor="category" className="ui-label">
            Category
          </label>
          <input id="category" name="category" className="ui-input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ui-field">
            <label htmlFor="city" className="ui-label">
              City
            </label>
            <input id="city" name="city" className="ui-input" />
          </div>
          <div className="ui-field">
            <label htmlFor="region" className="ui-label">
              Province / state
            </label>
            <input id="region" name="region" className="ui-input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ui-field">
            <label htmlFor="countryCode" className="ui-label">
              Country (CA or US)
            </label>
            <input id="countryCode" name="countryCode" className="ui-input" placeholder="CA" maxLength={2} />
          </div>
          <div className="ui-field">
            <label htmlFor="postalCode" className="ui-label">
              Postal / ZIP
            </label>
            <input id="postalCode" name="postalCode" className="ui-input" />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="publicProfileEnabled" className="size-4 rounded border" />
            Publish public profile
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="discoverable" className="size-4 rounded border" />
            Appear in marketplace
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Optional details</h2>
        <div className="ui-field">
          <label htmlFor="bio" className="ui-label">
            Bio
          </label>
          <textarea id="bio" name="bio" rows={3} className="ui-input min-h-[5rem]" />
        </div>
        <div className="ui-field">
          <label htmlFor="serviceArea" className="ui-label">
            Service area
          </label>
          <textarea id="serviceArea" name="serviceArea" rows={2} className="ui-input min-h-[4rem]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ui-field">
            <label htmlFor="contactPhone" className="ui-label">
              Contact phone
            </label>
            <input id="contactPhone" name="contactPhone" className="ui-input" />
          </div>
          <div className="ui-field">
            <label htmlFor="contactEmail" className="ui-label">
              Contact email
            </label>
            <input id="contactEmail" name="contactEmail" type="email" className="ui-input" />
          </div>
        </div>
        <div className="ui-field">
          <label htmlFor="websiteUrl" className="ui-label">
            Website
          </label>
          <input id="websiteUrl" name="websiteUrl" type="url" className="ui-input" placeholder="https://" />
        </div>
        <div className="ui-field">
          <label htmlFor="internalAdminNotes" className="ui-label">
            Internal notes
          </label>
          <textarea id="internalAdminNotes" name="internalAdminNotes" rows={2} className="ui-input min-h-[4rem]" />
        </div>
        <div className="ui-field">
          <label htmlFor="servicesJson" className="ui-label">
            Services (JSON array, optional)
          </label>
          <textarea
            id="servicesJson"
            name="servicesJson"
            rows={6}
            className="ui-input min-h-[8rem] font-mono text-xs"
            placeholder={`[\n  {\n    "name": "Intro visit",\n    "durationMinutes": 60,\n    "priceAmount": "120.00",\n    "canonicalTemplateSlug": "simple"\n  }\n]`}
          />
          <p className="ui-hint">
            Each object needs a name. Optional: durationMinutes, priceAmount, currency, description, canonicalTemplateSlug
            (defaults to “simple”).
          </p>
        </div>
      </section>

      {state && "error" in state && state.error ? (
        <div className="ui-alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="ui-btn-primary min-h-10 px-5 py-2">
        {pending ? "Creating…" : "Seed provider account"}
      </button>
    </form>
  );
}
