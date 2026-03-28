"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { CsrfField } from "@/components/csrf-field";
import { fetchPublicSlots, submitPublicBooking } from "@/actions/public-booking";
import type { ActionState } from "@/domain/auth/actions";
import { simulateServicePrice } from "@/domain/pricing/engine";
import type { TemplateAddOn, TemplateOutcome, TemplateStep } from "@/platform/templates/structure";

type TierOption = { id: string; label: string; multiplier: string };

type Props = {
  csrf: string;
  username: string;
  providerName: string;
  providerUsername: string;
  providerPaymentCash: boolean;
  providerPaymentEtransfer: boolean;
  providerEtransferDetails: string;
  providerCancellationPolicy: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePricingType: "fixed" | "hourly";
  servicePriceAmount: string;
  serviceCurrency: string;
  servicePrepInstructions: string;
  positioningTiers: TierOption[];
  defaultTierId: string;
  templateSteps: TemplateStep[];
  templateOutcomes: TemplateOutcome[];
  canonicalAddOns: TemplateAddOn[];
  addOnOverrides: { addOnId: string; enabled: boolean; priceOverride: string | null }[];
};

function formatPrice(input: { pricingType: "fixed" | "hourly"; amount: string; currency: string }): string | null {
  const n = Number(input.amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: input.currency || "CAD" });
    const base = fmt.format(n);
    return input.pricingType === "hourly" ? `${base}/hr` : base;
  } catch {
    return input.pricingType === "hourly" ? `${input.amount} ${input.currency}/hr` : `${input.amount} ${input.currency}`;
  }
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function prettyDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** YYYY-MM-DD in the user's local calendar (not UTC). */
function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MAX_DISPLAY_SLOTS = 10;

/** Up to `max` slots spread across the day (slots must be chronological). */
function spreadSlotsForDisplay(slots: { start: string; end: string }[], max: number): { start: string; end: string }[] {
  if (slots.length <= max) return slots;
  const n = slots.length;
  const picked: { start: string; end: string }[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.floor((i * (n - 1)) / (max - 1));
    picked.push(slots[idx]!);
  }
  return picked;
}

export function BookForm({
  csrf,
  username,
  providerName,
  providerUsername,
  providerPaymentCash,
  providerPaymentEtransfer,
  providerEtransferDetails,
  providerCancellationPolicy,
  serviceId,
  serviceName,
  serviceDurationMinutes,
  servicePricingType,
  servicePriceAmount,
  serviceCurrency,
  servicePrepInstructions,
  positioningTiers,
  defaultTierId,
  templateSteps,
  templateOutcomes,
  canonicalAddOns,
  addOnOverrides,
}: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [dateISO, setDateISO] = useState(() => localDateISO());
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotStart, setSlotStart] = useState("");
  const [pending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const hasPaymentChoice = providerPaymentCash || providerPaymentEtransfer;
  const [paymentMethod, setPaymentMethod] = useState<"" | "cash" | "etransfer">("");
  const [paymentError, setPaymentError] = useState("");
  const [state, action, formPending] = useActionState<ActionState, FormData>(
    submitPublicBooking,
    undefined
  );

  const overrideMap = useMemo(() => {
    const m = new Map<string, { enabled: boolean; priceOverride: string | null }>();
    for (const o of addOnOverrides) {
      m.set(o.addOnId, { enabled: o.enabled, priceOverride: o.priceOverride });
    }
    return m;
  }, [addOnOverrides]);

  const sortedSteps = useMemo(
    () => [...templateSteps].sort((a, b) => a.order - b.order),
    [templateSteps]
  );

  const initialTier =
    defaultTierId && positioningTiers.some((t) => t.id === defaultTierId)
      ? defaultTierId
      : positioningTiers[0]?.id ?? "";
  const [tierId, setTierId] = useState(initialTier);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  const tierMultiplier = useMemo(() => {
    const t = positioningTiers.find((x) => x.id === tierId);
    const n = t ? Number(t.multiplier) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [positioningTiers, tierId]);

  const disabledAddOnIds = useMemo(() => {
    const d = new Set<string>();
    for (const a of canonicalAddOns) {
      const o = overrideMap.get(a.id);
      if (o && !o.enabled) d.add(a.id);
    }
    return d;
  }, [canonicalAddOns, overrideMap]);

  const priceOverrides = useMemo(() => {
    const o: Record<string, string | null> = {};
    for (const a of canonicalAddOns) {
      const row = overrideMap.get(a.id);
      o[a.id] = row?.priceOverride ?? null;
    }
    return o;
  }, [canonicalAddOns, overrideMap]);

  const priceSim = useMemo(() => {
    return simulateServicePrice({
      serviceBaseAmount: servicePriceAmount,
      pricingType: servicePricingType,
      tierMultiplier,
      currency: serviceCurrency,
      canonicalAddOns,
      selectedAddOnIds: Array.from(selectedAddOns),
      priceOverrides,
      disabledAddOnIds,
    });
  }, [
    servicePriceAmount,
    servicePricingType,
    tierMultiplier,
    serviceCurrency,
    canonicalAddOns,
    selectedAddOns,
    priceOverrides,
    disabledAddOnIds,
  ]);

  const tierLabel = positioningTiers.find((t) => t.id === tierId)?.label ?? "";

  const todayISO = localDateISO();
  const isPastDate = Boolean(dateISO) && /^\d{4}-\d{2}-\d{2}$/.test(dateISO) && dateISO < todayISO;

  useEffect(() => {
    const today = localDateISO();
    const past = Boolean(dateISO) && /^\d{4}-\d{2}-\d{2}$/.test(dateISO) && dateISO < today;
    if (past) {
      setSlots([]);
      setSlotStart("");
      return;
    }
    startTransition(() => {
      fetchPublicSlots({ username, serviceId, dateISO }).then((res) => {
        setSlots(spreadSlotsForDisplay(res.slots, MAX_DISPLAY_SLOTS));
        setSlotStart("");
      });
    });
  }, [username, serviceId, dateISO]);

  useEffect(() => {
    if (!state?.error && !state?.success) return;
    const id = requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [state?.error, state?.success]);

  useEffect(() => {
    if (providerPaymentCash && !providerPaymentEtransfer) {
      setPaymentMethod("cash");
    } else if (!providerPaymentCash && providerPaymentEtransfer) {
      setPaymentMethod("etransfer");
    } else if (providerPaymentCash && providerPaymentEtransfer) {
      setPaymentMethod("");
    } else {
      setPaymentMethod("");
    }
    setPaymentError("");
  }, [providerPaymentCash, providerPaymentEtransfer]);

  const selectedLabel = slotStart ? prettyDateTime(slotStart) : null;
  const canSubmit = !!slotStart && !formPending && !isPastDate;
  const showSuccess = !!state?.success;

  function handleBookingSubmit(e: FormEvent<HTMLFormElement>) {
    if (isPastDate) {
      e.preventDefault();
      return;
    }
    if (!hasPaymentChoice) {
      setPaymentError("");
      return;
    }
    if (!paymentMethod) {
      e.preventDefault();
      setPaymentError("Please select a payment method");
      return;
    }
    setPaymentError("");
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Service summary */}
      <section className="ui-card p-4 sm:p-7" aria-label="Service summary">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--muted)]">{providerName}</div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">{serviceName}</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
              <span>{serviceDurationMinutes} min</span>
              <span className="min-w-0 break-words">
                Provider:{" "}
                <LinkLike href={`/${providerUsername}`} label={`/${providerUsername}`} />
              </span>
            </div>

            {templateOutcomes.length > 0 ? (
              <div className="mt-5">
                <div className="ui-overline text-[var(--muted)]">What you can expect</div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--foreground)] sm:text-[0.95rem]">
                  {templateOutcomes.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sortedSteps.length > 0 ? (
              <div className="mt-5">
                <div className="ui-overline text-[var(--muted)]">How it flows</div>
                <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-relaxed text-[var(--foreground)] sm:text-[0.95rem]">
                  {sortedSteps.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{s.title}</span>
                      {s.description?.trim() ? (
                        <span className="text-[var(--muted)]"> — {s.description}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {positioningTiers.length > 1 ? (
              <div className="ui-field mt-5 max-w-md">
                <label htmlFor="tier-select" className="ui-label">
                  Service level
                </label>
                <p id="tier-hint" className="ui-hint">
                  Tiers adjust list price for how this session is positioned.
                </p>
                <select
                  id="tier-select"
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                  className="ui-input mt-1"
                  aria-describedby="tier-hint"
                >
                  {positioningTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} (×{Number(t.multiplier).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {canonicalAddOns.some((a) => !disabledAddOnIds.has(a.id)) ? (
              <div className="mt-5">
                <div className="ui-overline text-[var(--muted)]">Add-ons</div>
                <ul className="mt-2 space-y-2">
                  {canonicalAddOns.map((a) => {
                    if (disabledAddOnIds.has(a.id)) return null;
                    const override = overrideMap.get(a.id)?.priceOverride;
                    const suggested = a.suggestedPrice != null ? Number(a.suggestedPrice) : null;
                    const raw =
                      override != null && override !== ""
                        ? Number(override)
                        : suggested != null && Number.isFinite(suggested)
                          ? suggested
                          : null;
                    const addLabel =
                      raw != null && Number.isFinite(raw)
                        ? `${a.label} (${formatMoney(raw, serviceCurrency)})`
                        : a.label;
                    return (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] px-3 py-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedAddOns.has(a.id)}
                            onChange={(e) => {
                              setSelectedAddOns((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(a.id);
                                else next.delete(a.id);
                                return next;
                              });
                            }}
                            className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--accent)]"
                          />
                          <span>
                            <span className="font-medium text-[var(--foreground)]">{addLabel}</span>
                            {a.description?.trim() ? (
                              <span className="mt-0.5 block text-[var(--muted)]">{a.description}</span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 border-t border-[color-mix(in_oklab,var(--foreground)_8%,transparent)] pt-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="ui-overline text-[var(--muted)]">Estimated total</div>
                  <div className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                    {formatMoney(priceSim.grandTotal, priceSim.currency)}
                  </div>
                  <p className="ui-hint mt-1 max-w-prose">
                    {servicePricingType === "hourly"
                      ? `Based on hourly rate × tier${tierLabel ? ` (${tierLabel})` : ""}`
                      : `List price × tier${tierLabel ? ` (${tierLabel})` : ""}`}
                    {selectedAddOns.size > 0 ? " plus selected add-ons." : "."}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--muted)]">
                  <div>List price</div>
                  <div className="font-medium text-[var(--foreground)]">
                    {formatPrice({
                      pricingType: servicePricingType,
                      amount: servicePriceAmount,
                      currency: serviceCurrency,
                    }) ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {selectedLabel ? (
            <div className="ui-pill-selected w-full min-w-0 shrink-0 sm:max-w-[240px]">
              <div className="ui-overline text-[var(--muted)]">Selected time</div>
              <div className="mt-1 break-words font-semibold text-[var(--foreground)]">{selectedLabel}</div>
            </div>
          ) : null}
        </div>

        {servicePrepInstructions?.trim() ? (
          <div className="ui-card-flat mt-5 px-4 py-3 text-sm sm:px-5 sm:py-4">
            <div className="font-semibold text-[var(--foreground)]">Before you arrive</div>
            <div className="mt-1.5 leading-relaxed text-[var(--muted)]">{servicePrepInstructions}</div>
          </div>
        ) : null}
      </section>

      {/* Feedback: scroll target — success/error render above the long form so users at the bottom otherwise miss it */}
      {state?.error || showSuccess ? (
        <div ref={feedbackRef} className="space-y-4">
          {state?.error ? (
            <div className="ui-alert-error" role="alert" aria-live="assertive">
              {state.error}
            </div>
          ) : null}
          {showSuccess ? (
            <section
              className="ui-success-panel p-5 sm:p-8"
              role="status"
              aria-label="Booking confirmed"
              aria-live="assertive"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--success-bg)] text-lg font-bold text-[var(--success)] ring-2 ring-[var(--success-border)]"
                  aria-hidden
                >
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight sm:text-xl">Booking confirmed</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                    You’re all set. You should receive an email confirmation shortly.
                  </p>
                  <div className="ui-card mt-5 px-4 py-4 text-sm shadow-none sm:px-5">
                    <div className="font-semibold text-[var(--foreground)]">{serviceName}</div>
                    <div className="mt-1 text-[var(--muted)]">
                      {providerName}
                      {selectedLabel ? ` • ${selectedLabel}` : ""}
                    </div>
                    <div className="mt-3 break-all rounded-md bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs text-[var(--muted)]">
                      Reference: {state.success}
                    </div>
                    <div className="mt-3 text-sm text-[var(--muted)]">
                      Estimated total booked:{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatMoney(priceSim.grandTotal, priceSim.currency)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
                    <span className="font-semibold text-[var(--foreground)]">What happens next:</span> the
                    provider will review your booking and follow up if anything is needed.
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* Steps — hide after success so the page clearly “changes” instead of leaving the form in view */}
      {!showSuccess ? (
        <section className="space-y-8 sm:space-y-10" aria-label="Booking steps">
        {/* Step 1 */}
        <div className="ui-card p-5 sm:p-7">
          <div className="flex gap-3 sm:gap-4">
            <span className="ui-step-badge" aria-hidden>
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="ui-overline">Step 1 of 3</p>
              <h3 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">Choose a time</h3>
              <p className="ui-hint mt-2 max-w-prose">
                Pick a date, then select an available time.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
            <div className="ui-field min-w-0">
              <label htmlFor="book-date" className="ui-label">
                Date
              </label>
              <p id="book-date-hint" className="ui-hint">
                Use the calendar to pick a day, or type a date.
              </p>
              <div className="mt-1 flex max-w-full gap-2">
                <input
                  ref={dateInputRef}
                  id="book-date"
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  aria-invalid={isPastDate}
                  aria-describedby={isPastDate ? "book-date-past-error book-date-hint" : "book-date-hint"}
                  className="ui-input min-w-0 flex-1 py-2.5"
                  style={{ colorScheme: "light" }}
                />
                <button
                  type="button"
                  className="ui-btn-ghost shrink-0"
                  aria-label="Open calendar"
                  title="Open calendar"
                  onClick={() => {
                    const el = dateInputRef.current;
                    if (el && typeof el.showPicker === "function") {
                      el.showPicker();
                    } else {
                      el?.focus();
                    }
                  }}
                >
                  <span className="sr-only">Open calendar</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
                    />
                  </svg>
                </button>
              </div>
              {isPastDate ? (
                <p id="book-date-past-error" className="ui-inline-validation mt-2" role="alert">
                  This date is in the past. Choose today or a future date.
                </p>
              ) : null}
            </div>

            <fieldset className="min-w-0">
              <legend className="ui-label">Available times</legend>
              {isPastDate ? (
                <p className="ui-hint mt-2">Pick a current or future date to see available times.</p>
              ) : pending ? (
                <p className="ui-hint mt-2">Loading times…</p>
              ) : slots.length ? (
                <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {slots.map((s) => {
                    const selected = slotStart === s.start;
                    return (
                      <li key={s.start}>
                        <label
                          className={["ui-choice", selected ? "ui-choice-selected" : ""].join(" ")}
                        >
                          <span className={selected ? "font-semibold text-[var(--foreground)]" : ""}>
                            {prettyDateTime(s.start)}
                          </span>
                          <input
                            type="radio"
                            name="slotPick"
                            checked={selected}
                            onChange={() => setSlotStart(s.start)}
                            className="h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--accent)]"
                            aria-label={`Select ${prettyDateTime(s.start)}`}
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="ui-empty-state mt-3">
                  <div className="font-semibold text-[var(--foreground)]">No times available</div>
                  <div className="ui-hint mt-1">Try another date — availability changes day to day.</div>
                </div>
              )}
            </fieldset>
          </div>
        </div>

        {/* Step 2 + 3 combined in one form to preserve backend */}
        <form action={action} className="space-y-8 sm:space-y-10" onSubmit={handleBookingSubmit}>
          <CsrfField token={csrf} />
          <input type="hidden" name="positioningTierId" value={tierId} />
          {Array.from(selectedAddOns).map((id) => (
            <input key={id} type="hidden" name="addOnIds" value={id} />
          ))}
          <input type="hidden" name="username" value={username} />
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="dateISO" value={dateISO} />
          <input type="hidden" name="slotStart" value={slotStart} />

          <div className="ui-card p-4 sm:p-7">
            <div className="flex gap-3 sm:gap-4">
              <span className="ui-step-badge" aria-hidden>
                2
              </span>
              <div className="min-w-0 flex-1">
                <p className="ui-overline">Step 2 of 3</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">Your details</h3>
                <p className="ui-hint mt-2 max-w-prose">We’ll use this to send confirmation and updates.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:gap-6">
              <div className="ui-field">
                <label className="ui-label" htmlFor="customerName">
                  Name
                </label>
                <input
                  id="customerName"
                  name="customerName"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  autoComplete="name"
                  className="ui-input"
                />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="customerEmail">
                  Email
                </label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  autoComplete="email"
                  className="ui-input"
                />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="customerPhone">
                  Phone <span className="font-normal text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  autoComplete="tel"
                  className="ui-input"
                />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="customerNotes">
                  Notes <span className="font-normal text-[var(--muted)]">(optional)</span>
                </label>
                <textarea
                  id="customerNotes"
                  name="customerNotes"
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="ui-textarea"
                />
              </div>
            </div>
          </div>

          <div className="ui-card p-4 sm:p-7">
            <div className="flex gap-3 sm:gap-4">
              <span className="ui-step-badge" aria-hidden>
                3
              </span>
              <div className="min-w-0 flex-1">
                <p className="ui-overline">Step 3 of 3</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">Review & confirm</h3>
                <p className="ui-hint mt-2 max-w-prose">
                  Double-check your time and details, then confirm your booking.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="ui-card-flat px-4 py-4 sm:px-5">
                <div className="ui-overline text-[var(--muted)]">Summary</div>
                <div className="mt-2 font-semibold text-[var(--foreground)]">You’re booking</div>
                <div className="mt-1 break-words text-sm text-[var(--muted)]">
                  {serviceName} • {providerName}
                </div>
                <div className="mt-4 border-t border-[var(--card-border)] pt-4">
                  <div className="ui-overline text-[var(--muted)]">Time</div>
                  <div className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {selectedLabel ?? "Select a time above"}
                  </div>
                </div>
                <div className="mt-4 border-t border-[var(--card-border)] pt-4">
                  <div className="ui-overline text-[var(--muted)]">Plan & price</div>
                  <div className="mt-1 text-sm text-[var(--foreground)]">
                    {tierLabel ? <span className="font-medium">{tierLabel}</span> : null}
                    {tierLabel && selectedAddOns.size > 0 ? " · " : null}
                    {selectedAddOns.size > 0 ? (
                      <span className="text-[var(--muted)]">
                        {selectedAddOns.size} add-on{selectedAddOns.size === 1 ? "" : "s"}
                      </span>
                    ) : !tierLabel ? (
                      <span className="text-[var(--muted)]">Standard pricing</span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {formatMoney(priceSim.grandTotal, priceSim.currency)} estimated
                  </div>
                </div>
              </div>

              {hasPaymentChoice ? (
                <div className="ui-card px-4 py-5 shadow-none sm:px-5">
                  <div className="ui-overline text-[var(--muted)]">Payment</div>
                  <div className="mt-1 font-semibold text-[var(--foreground)]">How will you pay?</div>
                  <fieldset className="mt-4 space-y-3">
                    <legend className="sr-only">Payment method</legend>
                    {providerPaymentCash ? (
                      <label
                        className={[
                          "ui-choice ui-choice-tall",
                          paymentMethod === "cash" ? "ui-choice-selected" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--foreground)]">Cash</span>
                          <span className="ui-hint mt-1 block">Pay in person at the appointment.</span>
                        </span>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={paymentMethod === "cash"}
                          onChange={() => {
                            setPaymentMethod("cash");
                            setPaymentError("");
                          }}
                          className="mt-1 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--accent)]"
                        />
                      </label>
                    ) : null}
                    {providerPaymentEtransfer ? (
                      <label
                        className={[
                          "ui-choice ui-choice-tall",
                          paymentMethod === "etransfer" ? "ui-choice-selected" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--foreground)]">E-transfer</span>
                          <span className="ui-hint mt-1 block">
                            Follow the instructions below after you select this option.
                          </span>
                        </span>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="etransfer"
                          checked={paymentMethod === "etransfer"}
                          onChange={() => {
                            setPaymentMethod("etransfer");
                            setPaymentError("");
                          }}
                          className="mt-1 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--accent)]"
                        />
                      </label>
                    ) : null}
                  </fieldset>

                  {paymentMethod === "etransfer" ? (
                    <div className="ui-card-flat mt-4 px-4 py-3 text-sm">
                      <div className="ui-overline text-[var(--muted)]">E-transfer instructions</div>
                      <div className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-[var(--foreground)]">
                        {providerEtransferDetails?.trim()
                          ? providerEtransferDetails
                          : "The provider will confirm e-transfer details by email after you book."}
                      </div>
                    </div>
                  ) : null}

                  {paymentError ? (
                    <p className="ui-inline-validation mt-3" role="alert">
                      {paymentError}
                    </p>
                  ) : null}

                  <p className="ui-hint mt-3">You’ll pay directly to the provider.</p>
                </div>
              ) : null}

              {providerCancellationPolicy?.trim() ? (
                <div className="ui-card-flat px-4 py-4 text-sm sm:px-5 sm:py-5">
                  <div className="ui-overline text-[var(--muted)]">Cancellation policy</div>
                  <div className="mt-2 break-words leading-relaxed text-[var(--foreground)]">
                    {providerCancellationPolicy}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex min-h-[2.75rem] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="submit" disabled={!canSubmit} className="ui-btn-primary w-full sm:w-auto">
                {formPending ? "Confirming…" : "Confirm booking"}
              </button>
              {isPastDate ? (
                <div className="ui-inline-validation text-sm">Fix the date above to continue.</div>
              ) : !slotStart ? (
                <div className="text-sm font-medium text-[var(--muted)]">Select a time to continue.</div>
              ) : null}
            </div>
          </div>
        </form>
        </section>
      ) : null}
    </div>
  );
}

function LinkLike({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="ui-link break-all">
      {label}
    </a>
  );
}
