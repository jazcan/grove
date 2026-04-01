"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { updatePositioningTiers, updatePricingProfile } from "@/actions/pricing";

type Profile = {
  name: string;
  currency: string;
};

type TierRow = {
  id: string;
  label: string;
  multiplier: string;
  sortOrder: number;
};

function profileFieldsUnchanged(form: HTMLFormElement, profile: Profile): boolean {
  const fd = new FormData(form);
  const name = (fd.get("name")?.toString() ?? "").trim();
  const currency = (fd.get("currency")?.toString() ?? "").trim();
  return name === profile.name.trim() && currency.toUpperCase() === profile.currency.trim().toUpperCase();
}

function tierFieldsUnchanged(form: HTMLFormElement, tiers: TierRow[]): boolean {
  const fd = new FormData(form);
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const label = (fd.get(`tierLabel_${i}`)?.toString() ?? "").trim();
    const mult = Number(fd.get(`tierMult_${i}`)?.toString() ?? "");
    if (label !== t.label.trim()) return false;
    const prev = Number(t.multiplier);
    if (!Number.isFinite(mult) || !Number.isFinite(prev) || mult !== prev) return false;
  }
  return true;
}

export function PricingProfileForm({
  profile,
  csrf,
}: {
  profile: Profile;
  csrf: string;
}) {
  const [state, action, pending] = useActionState(updatePricingProfile, undefined);
  const [noChangesHint, setNoChangesHint] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success != null || state?.error != null) setNoChangesHint(null);
  }, [state]);

  return (
    <form
      action={action}
      className="ui-card space-y-4 p-5 sm:p-7"
      onInput={() => setNoChangesHint(null)}
      onSubmit={(e) => {
        if (profileFieldsUnchanged(e.currentTarget, profile)) {
          e.preventDefault();
          setNoChangesHint("No changes to save.");
        }
      }}
    >
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Pricing profile</h2>
      <p className="ui-hint max-w-prose">
        Set your currency and how your pricing scales across service levels.
      </p>
      <CsrfField token={csrf} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Name</span>
          <input name="name" className="ui-input mt-1" defaultValue={profile.name} required />
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Currency</span>
          <input name="currency" className="ui-input mt-1" defaultValue={profile.currency} maxLength={8} required />
        </label>
      </div>
      {state?.error ? (
        <div className="ui-alert-error text-sm" role="alert">
          {state.error}
        </div>
      ) : null}
      {noChangesHint ? (
        <div className="ui-hint text-sm" role="status">
          {noChangesHint}
        </div>
      ) : null}
      {!noChangesHint && state?.success ? (
        <div className="text-sm font-medium text-[var(--success)]" role="status">
          {state.success}
        </div>
      ) : null}
      <button type="submit" disabled={pending} className="ui-btn-primary min-h-11 px-5 text-sm font-semibold">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function PositioningTiersForm({
  tiers,
  csrf,
}: {
  tiers: TierRow[];
  csrf: string;
}) {
  const [state, action, pending] = useActionState(updatePositioningTiers, undefined);
  const [noChangesHint, setNoChangesHint] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success != null || state?.error != null) setNoChangesHint(null);
  }, [state]);

  return (
    <form
      action={action}
      className="ui-card space-y-4 p-5 sm:p-7"
      onInput={() => setNoChangesHint(null)}
      onSubmit={(e) => {
        if (tierFieldsUnchanged(e.currentTarget, tiers)) {
          e.preventDefault();
          setNoChangesHint("No changes to save.");
        }
      }}
    >
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Positioning tiers</h2>
      <p className="ui-hint max-w-prose">
        These adjust your pricing across different service levels.
      </p>
      <CsrfField token={csrf} />
      <input type="hidden" name="tierCount" value={tiers.length} />
      <div className="space-y-4">
        {tiers.map((t, i) => (
          <div
            key={t.id}
            className="grid gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4 sm:grid-cols-[1fr_120px]"
          >
            <input type="hidden" name={`tierId_${i}`} value={t.id} />
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Label</span>
              <input name={`tierLabel_${i}`} className="ui-input mt-1" defaultValue={t.label} required />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Multiplier</span>
              <input
                name={`tierMult_${i}`}
                type="number"
                step="0.0001"
                min="0.01"
                max="100"
                className="ui-input mt-1"
                defaultValue={t.multiplier}
                required
              />
            </label>
          </div>
        ))}
      </div>
      {state?.error ? (
        <div className="ui-alert-error text-sm" role="alert">
          {state.error}
        </div>
      ) : null}
      {noChangesHint ? (
        <div className="ui-hint text-sm" role="status">
          {noChangesHint}
        </div>
      ) : null}
      {!noChangesHint && state?.success ? (
        <div className="text-sm font-medium text-[var(--success)]" role="status">
          {state.success}
        </div>
      ) : null}
      <button type="submit" disabled={pending} className="ui-btn-primary min-h-11 px-5 text-sm font-semibold">
        {pending ? "Saving…" : "Save tiers"}
      </button>
    </form>
  );
}
