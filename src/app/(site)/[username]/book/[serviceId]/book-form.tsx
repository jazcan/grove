"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { CsrfField } from "@/components/csrf-field";
import {
  fetchPublicSlots,
  lookupPublicDiscountCode,
  submitPublicBooking,
  suggestPublicBookingSlot,
} from "@/actions/public-booking";
import type { ActionState } from "@/domain/auth/actions";
import {
  applyTipToSimulatedPrice,
  PUBLIC_BOOKING_MAX_TIP_PERCENT,
  simulateServicePrice,
} from "@/domain/pricing/engine";
import type { TemplateAddOn, TemplateOutcome, TemplateStep } from "@/platform/templates/structure";

type TierOption = { id: string; label: string; multiplier: string };

type Props = {
  csrf: string;
  username: string;
  providerName: string;
  providerPaymentCash: boolean;
  providerPaymentEtransfer: boolean;
  providerPaymentInPersonCreditDebit: boolean;
  providerEtransferDetails: string;
  providerCancellationPolicy: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePricingType: "fixed" | "hourly";
  servicePriceAmount: string;
  serviceCurrency: string;
  servicePrepInstructions: string;
  pricingUsesSingleLevel: boolean;
  phoneRequired: boolean;
  notesRequired: boolean;
  notesInstructions: string;
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
  providerPaymentCash,
  providerPaymentEtransfer,
  providerPaymentInPersonCreditDebit,
  providerEtransferDetails,
  providerCancellationPolicy,
  serviceId,
  serviceName,
  serviceDurationMinutes,
  servicePricingType,
  servicePriceAmount,
  serviceCurrency,
  servicePrepInstructions,
  pricingUsesSingleLevel,
  phoneRequired,
  notesRequired,
  notesInstructions,
  positioningTiers,
  defaultTierId,
  templateSteps,
  templateOutcomes,
  canonicalAddOns,
  addOnOverrides,
}: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const initialSlotPickRef = useRef<string | null>(null);
  const [calendarReady, setCalendarReady] = useState(false);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [bookingsPaused, setBookingsPaused] = useState(false);
  const [slotStart, setSlotStart] = useState("");
  const [pending, startTransition] = useTransition();
  const [nextAvailableHighlight, setNextAvailableHighlight] = useState<{
    dateISO: string;
    slotStart: string;
  } | null>(null);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const hasPaymentChoice =
    providerPaymentCash || providerPaymentEtransfer || providerPaymentInPersonCreditDebit;
  const [paymentMethod, setPaymentMethod] = useState<
    "" | "cash" | "etransfer" | "in_person_credit_debit"
  >("");
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
  const [tipPercent, setTipPercent] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [discountHint, setDiscountHint] = useState<string | null>(null);
  const [discountBusy, setDiscountBusy] = useState(false);

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

  const priceWithTip = useMemo(() => {
    const preTip = priceSim.grandTotal;
    const d = appliedDiscountPercent;
    const discountAmt = d > 0 ? Math.round(preTip * (d / 100) * 100) / 100 : 0;
    const after = Math.max(0, Math.round((preTip - discountAmt) * 100) / 100);
    return applyTipToSimulatedPrice({ ...priceSim, grandTotal: after }, tipPercent);
  }, [priceSim, tipPercent, appliedDiscountPercent]);

  useEffect(() => {
    setAppliedDiscountCode("");
    setAppliedDiscountPercent(0);
    setDiscountHint(null);
  }, [tierId, selectedAddOns]);

  const tierLabel = positioningTiers.find((t) => t.id === tierId)?.label ?? "";

  const todayISO = localDateISO();
  const dateISOValue = dateISO ?? "";
  const isPastDate =
    Boolean(dateISO) && /^\d{4}-\d{2}-\d{2}$/.test(dateISOValue) && dateISOValue < todayISO;

  useEffect(() => {
    let cancelled = false;
    suggestPublicBookingSlot({ username, serviceId }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        initialSlotPickRef.current = res.slotStart;
        setNextAvailableHighlight({ dateISO: res.dateISO, slotStart: res.slotStart });
        setDateISO(res.dateISO);
        setBookingsPaused(false);
      } else {
        if (res.bookingsPaused) setBookingsPaused(true);
        else setBookingsPaused(false);
        setDateISO(localDateISO());
        setNextAvailableHighlight(null);
      }
      setCalendarReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [username, serviceId]);

  useEffect(() => {
    if (!calendarReady || dateISO == null) return;
    const today = localDateISO();
    const past = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) && dateISO < today;
    if (past) {
      setSlots([]);
      setSlotStart("");
      return;
    }
    startTransition(() => {
      fetchPublicSlots({ username, serviceId, dateISO }).then((res) => {
        setBookingsPaused(!!res.bookingsPaused);
        const displayed = spreadSlotsForDisplay(res.slots, MAX_DISPLAY_SLOTS);
        setSlots(displayed);
        setSlotStart((prev) => {
          const pick = initialSlotPickRef.current;
          if (pick && displayed.some((s) => s.start === pick)) {
            initialSlotPickRef.current = null;
            return pick;
          }
          initialSlotPickRef.current = null;
          if (displayed.length === 0) return "";
          if (prev && displayed.some((s) => s.start === prev)) return prev;
          return displayed[0]!.start;
        });
      });
    });
  }, [calendarReady, username, serviceId, dateISO]);

  useEffect(() => {
    if (!state?.error && !state?.success) return;
    const id = requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [state?.error, state?.success]);

  useEffect(() => {
    const enabled: ("cash" | "etransfer" | "in_person_credit_debit")[] = [];
    if (providerPaymentCash) enabled.push("cash");
    if (providerPaymentEtransfer) enabled.push("etransfer");
    if (providerPaymentInPersonCreditDebit) enabled.push("in_person_credit_debit");
    if (enabled.length === 1) {
      setPaymentMethod(enabled[0]!);
    } else {
      setPaymentMethod("");
    }
    setPaymentError("");
  }, [providerPaymentCash, providerPaymentEtransfer, providerPaymentInPersonCreditDebit]);

  const selectedLabel = slotStart ? prettyDateTime(slotStart) : null;
  const canSubmit =
    calendarReady &&
    !!dateISO &&
    !!slotStart &&
    !formPending &&
    !isPastDate;
  const showNotesGuidance = notesRequired || Boolean(notesInstructions.trim());
  const notesGuidanceText = notesInstructions.trim()
    ? notesInstructions.trim()
    : notesRequired
      ? "Please include the details your provider needs for this appointment."
      : "";
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
                  Pick the option that fits you best—each level is priced differently.
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
                      {t.label}
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
                  <div
                    className="ui-overline w-fit cursor-help border-b border-dotted border-[color-mix(in_oklab,var(--foreground)_30%,transparent)] text-[var(--muted)]"
                    title="Final price may vary if the work takes longer or differs from what was booked. Your provider will confirm if anything changes."
                  >
                    Estimated total
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                    {formatMoney(priceWithTip.grandTotal, priceWithTip.currency)}
                  </div>
                  <p className="ui-hint mt-1 max-w-prose">
                    {pricingUsesSingleLevel
                      ? servicePricingType === "hourly"
                        ? `Based on the hourly rate shown above${selectedAddOns.size > 0 ? ", plus selected add-ons" : ""}.`
                        : `Based on the service price shown above${selectedAddOns.size > 0 ? ", plus selected add-ons" : ""}.`
                      : servicePricingType === "hourly"
                        ? `Price reflects the level you choose${tierLabel ? ` (${tierLabel})` : ""}${selectedAddOns.size > 0 ? " and selected add-ons" : ""}.`
                        : `Price reflects the level you choose${tierLabel ? ` (${tierLabel})` : ""}${selectedAddOns.size > 0 ? " and selected add-ons" : ""}.`}{" "}
                    Tips are optional and can be changed in the last step.
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
                    <div className="mt-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)]">
                      <span className="font-medium">Confirmation:</span>{" "}
                      <span className="font-mono tabular-nums tracking-wide">{state.success}</span>
                    </div>
                    <div className="mt-3 text-sm text-[var(--muted)]">
                      Estimated total booked:{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatMoney(priceWithTip.grandTotal, priceWithTip.currency)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
                    <span className="font-semibold text-[var(--foreground)]">What happens next:</span>{" "}
                    {providerName} will review your booking and follow up if anything is needed.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                    Want to save your details for next time?{" "}
                    <Link href="/signup" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                      Create a free account
                    </Link>
                    .
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
                Choose an available time. The next available time is pre-selected.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
            <div className="ui-field min-w-0">
              <label htmlFor="book-date" className="ui-label">
                Date
              </label>
              <input
                ref={dateInputRef}
                id="book-date"
                type="date"
                value={dateISO ?? ""}
                min={todayISO}
                disabled={!calendarReady}
                onChange={(e) => setDateISO(e.target.value)}
                aria-invalid={isPastDate}
                aria-describedby={isPastDate ? "book-date-past-error" : undefined}
                className="ui-input mt-1 min-w-0 max-w-full py-2.5"
                style={{ colorScheme: "light" }}
              />
              {isPastDate ? (
                <p id="book-date-past-error" className="ui-inline-validation mt-2" role="alert">
                  This date is in the past. Choose today or a future date.
                </p>
              ) : null}
            </div>

            <fieldset className="min-w-0">
              <legend className="ui-label">Available times</legend>
              {!calendarReady ? (
                <p className="ui-hint mt-2">Finding the next available time…</p>
              ) : isPastDate ? (
                <p className="ui-hint mt-2">Pick a current or future date to see available times.</p>
              ) : pending ? (
                <p className="ui-hint mt-2">Loading times…</p>
              ) : bookingsPaused ? (
                <div className="ui-empty-state mt-3">
                  <div className="font-semibold text-[var(--foreground)]">Bookings paused</div>
                  <div className="ui-hint mt-1">
                    This provider isn’t accepting new appointments right now. Check back later or contact them directly.
                  </div>
                </div>
              ) : slots.length ? (
                <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {slots.map((s) => {
                    const selected = slotStart === s.start;
                    const isNextAvailable =
                      nextAvailableHighlight != null &&
                      dateISO === nextAvailableHighlight.dateISO &&
                      s.start === nextAvailableHighlight.slotStart;
                    return (
                      <li key={s.start}>
                        <label
                          className={["ui-choice", selected ? "ui-choice-selected" : ""].join(" ")}
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <span
                              className={
                                selected ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"
                              }
                            >
                              {prettyDateTime(s.start)}
                            </span>
                            {isNextAvailable ? (
                              <span className="text-xs font-medium text-[var(--muted)]">Next available</span>
                            ) : null}
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
          <input type="hidden" name="dateISO" value={dateISOValue} />
          <input type="hidden" name="slotStart" value={slotStart} />
          <input type="hidden" name="tipPercent" value={String(tipPercent)} />
          {appliedDiscountCode ? <input type="hidden" name="discountCode" value={appliedDiscountCode} /> : null}

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
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="ui-field">
                  <label className="ui-label" htmlFor="customerFirstName">
                    First name
                  </label>
                  <input
                    id="customerFirstName"
                    name="customerFirstName"
                    required
                    value={customerFirstName}
                    onChange={(e) => setCustomerFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="ui-input"
                  />
                </div>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="customerLastName">
                    Last name
                  </label>
                  <input
                    id="customerLastName"
                    name="customerLastName"
                    required
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    autoComplete="family-name"
                    className="ui-input"
                  />
                </div>
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
                  Phone
                  {phoneRequired ? (
                    <span className="text-[var(--error)]" aria-hidden>
                      {" "}
                      *
                    </span>
                  ) : (
                    <span className="font-normal text-[var(--muted)]"> (optional)</span>
                  )}
                </label>
                {!phoneRequired ? (
                  <p id="phone-hint" className="ui-hint">
                    Add a number if you&apos;d like texts or calls from {providerName}.
                  </p>
                ) : null}
                <input
                  id="customerPhone"
                  name="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  autoComplete="tel"
                  className={phoneRequired ? "ui-input" : "ui-input mt-1"}
                  required={phoneRequired}
                  aria-required={phoneRequired}
                  aria-describedby={!phoneRequired ? "phone-hint" : undefined}
                />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="customerNotes">
                  Notes
                  {notesRequired ? (
                    <span className="text-[var(--error)]" aria-hidden>
                      {" "}
                      *
                    </span>
                  ) : (
                    <span className="font-normal text-[var(--muted)]"> (optional)</span>
                  )}
                </label>
                {showNotesGuidance ? (
                  <div className="ui-card-flat mt-1 px-4 py-3 text-sm leading-relaxed text-[var(--foreground)]">
                    {notesGuidanceText}
                  </div>
                ) : null}
                <textarea
                  id="customerNotes"
                  name="customerNotes"
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="ui-textarea mt-1"
                  required={notesRequired}
                  aria-required={notesRequired}
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
                <label className="ui-label" htmlFor="discount-code-input">
                  Discount code <span className="font-normal text-[var(--muted)]">(optional)</span>
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <input
                    id="discount-code-input"
                    className="ui-input min-h-11 sm:w-56"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SPRING10"
                    autoComplete="off"
                    maxLength={32}
                  />
                  <button
                    type="button"
                    disabled={discountBusy || !discountInput.trim()}
                    className="ui-btn-secondary min-h-11 px-4 text-sm font-semibold disabled:opacity-50"
                    onClick={() => {
                      void (async () => {
                        setDiscountBusy(true);
                        setDiscountHint(null);
                        const r = await lookupPublicDiscountCode({
                          username,
                          code: discountInput.trim(),
                        });
                        setDiscountBusy(false);
                        if (r.ok) {
                          setAppliedDiscountPercent(r.percent);
                          setAppliedDiscountCode(discountInput.trim().toUpperCase());
                          setDiscountHint(`${r.percent}% off applied to your subtotal before tip.`);
                        } else {
                          setAppliedDiscountPercent(0);
                          setAppliedDiscountCode("");
                          setDiscountHint("That code doesn’t apply here. Double-check spelling.");
                        }
                      })();
                    }}
                  >
                    {discountBusy ? "Checking…" : "Apply"}
                  </button>
                  {appliedDiscountCode ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                      onClick={() => {
                        setAppliedDiscountCode("");
                        setAppliedDiscountPercent(0);
                        setDiscountHint(null);
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {discountHint ? (
                  <p
                    className={`mt-2 text-sm ${appliedDiscountCode ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
                    role="status"
                  >
                    {discountHint}
                  </p>
                ) : null}
              </div>

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
                    <span
                      className={
                        pricingUsesSingleLevel || !tierLabel
                          ? "text-[var(--muted)]"
                          : "font-medium text-[var(--foreground)]"
                      }
                    >
                      {pricingUsesSingleLevel ? "Service price" : tierLabel || "Standard pricing"}
                    </span>
                    {selectedAddOns.size > 0 ? (
                      <>
                        <span className="text-[var(--muted)]"> · </span>
                        <span className="text-[var(--muted)]">
                          {selectedAddOns.size} add-on{selectedAddOns.size === 1 ? "" : "s"}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span
                        className="cursor-help border-b border-dotted border-[color-mix(in_oklab,var(--foreground)_35%,transparent)] text-[var(--muted)]"
                        title="Final price may vary if the work takes longer or differs from what was booked. Your provider will confirm if anything changes."
                      >
                        Subtotal (estimated)
                      </span>
                      <span className="font-medium tabular-nums text-[var(--foreground)]">
                        {formatMoney(priceWithTip.subtotal, priceWithTip.currency)}
                      </span>
                    </div>
                    <div className="ui-field pt-1">
                      <label htmlFor="booking-tip-slider" className="ui-label">
                        Tip (optional)
                      </label>
                      <p id="booking-tip-hint" className="ui-hint">
                        {servicePricingType === "hourly"
                          ? "Tip is a percentage of this booking’s estimated total (rate, level, and add-ons)."
                          : "Tip is a percentage of this booking’s estimated total (service, level, and add-ons)."}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          id="booking-tip-slider"
                          type="range"
                          min={0}
                          max={PUBLIC_BOOKING_MAX_TIP_PERCENT}
                          step={1}
                          value={tipPercent}
                          onChange={(e) => setTipPercent(Number(e.target.value))}
                          className="h-2 w-full min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
                          aria-valuemin={0}
                          aria-valuemax={PUBLIC_BOOKING_MAX_TIP_PERCENT}
                          aria-valuenow={tipPercent}
                          aria-describedby="booking-tip-hint"
                        />
                        <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
                          {tipPercent}%
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="text-[var(--muted)]">Tip amount</span>
                        <span className="font-medium tabular-nums text-[var(--foreground)]">
                          {formatMoney(priceWithTip.tipAmount, priceWithTip.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--card-border)] pt-3">
                      <span
                        className="cursor-help text-base font-semibold text-[var(--foreground)] underline decoration-dotted decoration-[color-mix(in_oklab,var(--foreground)_35%,transparent)] underline-offset-4"
                        title="Final price may vary if the work takes longer or differs from what was booked. Your provider will confirm if anything changes."
                      >
                        Total (estimated)
                      </span>
                      <span className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
                        {formatMoney(priceWithTip.grandTotal, priceWithTip.currency)}
                      </span>
                    </div>
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
                    {providerPaymentInPersonCreditDebit ? (
                      <label
                        className={[
                          "ui-choice ui-choice-tall",
                          paymentMethod === "in_person_credit_debit" ? "ui-choice-selected" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--foreground)]">
                            In person credit/debit
                          </span>
                          <span className="ui-hint mt-1 block">Pay with card at the appointment.</span>
                        </span>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="in_person_credit_debit"
                          checked={paymentMethod === "in_person_credit_debit"}
                          onChange={() => {
                            setPaymentMethod("in_person_credit_debit");
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
