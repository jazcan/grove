"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { createService } from "@/actions/services";
import type { ServiceFormDefaults } from "@/lib/service-templates";

function emptyScratchDefaults(): ServiceFormDefaults {
  return {
    name: "",
    description: "",
    category: "",
    durationMinutes: 60,
    bufferMinutes: 10,
    pricingType: "fixed",
    priceAmount: "50.00",
    currency: "CAD",
    prepInstructions: "",
  };
}

type Props = {
  csrf: string;
  /** Resolved defaults when `prefill` query matched; null when opening via scratch only. */
  prefillDefaults: ServiceFormDefaults | null;
  formVisible: boolean;
  scratchMode: boolean;
};

const editableSectionClass = (on: boolean) =>
  [
    "grid gap-3 rounded-xl transition-[box-shadow,background-color] duration-300",
    on
      ? "bg-[color-mix(in_oklab,var(--accent)_6%,var(--card))] shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--accent)_26%,transparent)]"
      : "",
  ].join(" ");

export function ServiceCreateSection({ csrf, prefillDefaults, formVisible, scratchMode }: Props) {
  const [highlight, setHighlight] = useState(false);

  const values: ServiceFormDefaults = prefillDefaults ?? emptyScratchDefaults();
  const showAdjustHint = formVisible && (prefillDefaults !== null || scratchMode);
  const pulseFields = highlight && (prefillDefaults !== null || scratchMode);

  useEffect(() => {
    if (!formVisible) return;
    const shouldScroll =
      window.location.hash === "#service-form" ||
      prefillDefaults !== null ||
      scratchMode;
    if (!shouldScroll) return;
    requestAnimationFrame(() => {
      document.getElementById("service-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [formVisible, prefillDefaults, scratchMode]);

  useEffect(() => {
    if (!formVisible) return;
    setHighlight(true);
    const t = window.setTimeout(() => setHighlight(false), 2200);
    return () => window.clearTimeout(t);
  }, [formVisible, prefillDefaults, scratchMode]);

  if (!formVisible) {
    return (
      <section
        id="service-form"
        className="max-w-[640px] scroll-mt-28 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] px-5 py-10 text-center shadow-[var(--shadow-card)] sm:px-8"
        aria-labelledby="create-from-scratch-heading"
      >
        <h2 id="create-from-scratch-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Create from scratch
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Build every field yourself when you already know exactly what you want.
        </p>
        <Link
          href="/dashboard/services?scratch=1#service-form"
          className="ui-btn-secondary mt-6 inline-flex min-h-11 items-center justify-center px-6 text-sm font-semibold"
        >
          Create from scratch
        </Link>
      </section>
    );
  }

  return (
    <section id="add-service" className="max-w-[640px] scroll-mt-28">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Review and save</h2>
        <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Create a service clients can book.
        </p>
        {showAdjustHint ? (
          <p className="mt-2 rounded-lg bg-[color-mix(in_oklab,var(--accent)_8%,var(--background))] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_20%,transparent)]">
            You can adjust anything before saving.
          </p>
        ) : null}
      </div>

      <form
        id="service-form"
        action={asFormAction(createService)}
        className="grid gap-10 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] transition-shadow duration-300 sm:p-8"
      >
        <CsrfField token={csrf} />
        <input type="hidden" name="returnTo" value="/dashboard/services#existing-services" />

        <section className={editableSectionClass(!!pulseFields)}>
          <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">Basic info</div>
          <input
            name="name"
            placeholder="e.g. Initial consultation"
            required
            defaultValue={values.name}
            className="ui-input"
          />
          <textarea
            name="description"
            placeholder="What clients get from this booking"
            rows={4}
            defaultValue={values.description}
            className="ui-textarea"
          />
          <input
            name="category"
            placeholder="e.g. Wellness, home services, tutoring"
            defaultValue={values.category}
            className="ui-input"
          />
        </section>

        <section className={editableSectionClass(!!pulseFields)}>
          <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">Duration & buffer</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Duration (minutes)</span>
              <input
                name="durationMinutes"
                type="number"
                min={5}
                defaultValue={values.durationMinutes}
                className="ui-input mt-1 rounded-xl"
              />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Buffer (minutes)</span>
              <input
                name="bufferMinutes"
                type="number"
                min={0}
                defaultValue={values.bufferMinutes}
                className="ui-input mt-1 rounded-xl"
              />
            </label>
          </div>
        </section>

        <section className={editableSectionClass(!!pulseFields)}>
          <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">Pricing</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Type</span>
              <select name="pricingType" defaultValue={values.pricingType} className="ui-input mt-1">
                <option value="fixed">Fixed price</option>
                <option value="hourly">Hourly (starting rate)</option>
              </select>
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Price</span>
              <input
                name="priceAmount"
                placeholder="0.00"
                defaultValue={values.priceAmount}
                className="ui-input mt-1"
              />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Currency</span>
              <input name="currency" defaultValue={values.currency} className="ui-input mt-1" />
            </label>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
            Before the appointment (optional)
          </div>
          <textarea
            name="prepInstructions"
            placeholder="Anything clients should know or bring beforehand"
            rows={3}
            defaultValue={values.prepInstructions}
            className="ui-textarea"
          />
        </section>

        <section className="grid gap-3">
          <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
            Make this service available to clients
          </div>
          <label className="flex items-start gap-3 text-sm leading-snug">
            <input type="checkbox" name="isActive" defaultChecked className="mt-1" />
            <span>Active — clients can see and book this when your profile is live</span>
          </label>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
            You can refine this anytime after saving.
          </p>
          <button type="submit" className="ui-btn-primary min-h-11 w-full px-6 text-sm font-semibold sm:w-auto">
            Create service
          </button>
        </div>
      </form>
    </section>
  );
}
