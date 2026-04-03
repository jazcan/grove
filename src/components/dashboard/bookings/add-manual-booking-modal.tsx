"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import {
  createManualBooking,
  estimateManualBookingPrices,
  fetchManualBookingSlots,
} from "@/actions/booking-dashboard";
import { CsrfField } from "@/components/csrf-field";

export type ServiceOpt = {
  id: string;
  name: string;
  durationMinutes?: number;
  priceAmount?: string;
  pricingType?: "fixed" | "hourly";
  currency?: string;
};
type CustomerOpt = { id: string; fullName: string; email: string };

type OpenFn = () => void;

const ManualBookingOpenContext = createContext<OpenFn | null>(null);

export function useOpenManualBookingModal(): OpenFn {
  const fn = useContext(ManualBookingOpenContext);
  return fn ?? (() => {});
}

type RootProps = {
  csrf: string;
  services: ServiceOpt[];
  customers: CustomerOpt[];
  timezone: string;
  minDateISO: string;
  maxDateISO: string;
  paymentCash: boolean;
  paymentEtransfer: boolean;
  children: ReactNode;
  /** Open modal on mount (e.g. deep-linked from customer profile). */
  autoOpen?: boolean;
  /** When opening, pre-select this CRM customer in “Existing customer”. */
  preselectCustomerId?: string | null;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function ManualBookingModalRoot({
  csrf,
  services,
  customers,
  timezone,
  minDateISO,
  maxDateISO,
  paymentCash,
  paymentEtransfer,
  children,
  autoOpen = false,
  preselectCustomerId = null,
}: RootProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(createManualBooking, undefined);
  const open = useCallback(() => dialogRef.current?.showModal(), []);

  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "walkin">(() => {
    if (preselectCustomerId && customers.some((c) => c.id === preselectCustomerId)) return "existing";
    return customers.length > 0 ? "existing" : "new";
  });
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [dateISO, setDateISO] = useState(minDateISO);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | undefined>();
  const [slotStart, setSlotStart] = useState("");
  const [custQuery, setCustQuery] = useState("");
  const [pickedCustomerId, setPickedCustomerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [estimate, setEstimate] = useState<{
    total: number;
    currency: string;
    lines: { name: string; amount: number }[];
  } | null>(null);

  const orderedServiceIds = useMemo(() => {
    const rest = extraIds.filter((id) => id && id !== serviceId);
    return [serviceId, ...rest].filter(Boolean);
  }, [serviceId, extraIds]);

  useEffect(() => {
    if (state?.success) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [state?.success, router]);

  useEffect(() => {
    if (!autoOpen) return;
    open();
  }, [autoOpen, open]);

  useEffect(() => {
    if (!preselectCustomerId || !customers.some((c) => c.id === preselectCustomerId)) return;
    const c = customers.find((x) => x.id === preselectCustomerId);
    if (c) {
      setPickedCustomerId(c.id);
      setCustQuery(`${c.fullName} (${c.email})`);
    }
  }, [preselectCustomerId, customers]);

  useEffect(() => {
    setExtraIds((prev) => prev.filter((id) => id !== serviceId));
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !dateISO) {
      setSlots([]);
      setSlotStart("");
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(undefined);
    fetchManualBookingSlots({ serviceId, dateISO }).then((r) => {
      if (cancelled) return;
      if (r.error) setSlotsError(r.error);
      setSlots(r.slots);
      setSlotStart("");
      setSlotsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, dateISO]);

  useEffect(() => {
    if (orderedServiceIds.length === 0) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    estimateManualBookingPrices({ serviceIds: orderedServiceIds }).then((r) => {
      if (cancelled) return;
      if (!("ok" in r) || r.ok !== true) {
        setEstimate(null);
        return;
      }
      setEstimate({ total: r.total, currency: r.currency, lines: r.lines });
    });
    return () => {
      cancelled = true;
    };
  }, [orderedServiceIds]);

  const slotOptions = useMemo(() => {
    return slots.map((s) => ({
      value: s.start,
      label: DateTime.fromISO(s.start, { zone: "utc" }).setZone(timezone).toFormat("h:mm a"),
    }));
  }, [slots, timezone]);

  useEffect(() => {
    if (slotStart && !slots.some((s) => s.start === slotStart)) {
      setSlotStart("");
    }
  }, [slots, slotStart]);

  const filteredCustomers = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers
      .filter((c) => `${c.fullName} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [customers, custQuery]);

  const hasServices = services.length > 0;
  const showPayMethods = paymentStatus === "paid" && paymentCash && paymentEtransfer;

  return (
    <ManualBookingOpenContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-[100] m-0 max-h-[min(92vh,40rem)] w-[min(100%,28rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] backdrop:bg-black/40"
      >
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Add booking</h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Create a time on your calendar. Availability follows your usual rules.
          </p>
        </div>

        {!hasServices ? (
          <div className="px-6 py-8">
            <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
              Add an active service first, then you can create bookings here.
            </p>
            <button
              type="button"
              className="ui-btn-secondary mt-6 min-h-11 w-full px-4 text-sm font-semibold sm:w-auto"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>
        ) : (
          <form action={formAction} className="grid max-h-[min(74vh,36rem)] gap-4 overflow-y-auto px-6 py-5">
            <CsrfField token={csrf} />
            <input type="hidden" name="customerMode" value={customerMode} />
            {orderedServiceIds.map((id) => (
              <input key={id} type="hidden" name="serviceIds" value={id} />
            ))}

            {state?.error ? (
              <div
                role="alert"
                className="rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
              >
                {state.error}
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Customer</span>
              <select
                className="ui-input"
                value={customerMode}
                onChange={(e) => {
                  const v = e.target.value as "existing" | "new" | "walkin";
                  setCustomerMode(v);
                  setCustQuery("");
                  setPickedCustomerId("");
                }}
                aria-label="Customer source"
              >
                {customers.length > 0 ? <option value="existing">Existing customer</option> : null}
                <option value="new">New customer</option>
                <option value="walkin">No client (walk-in)</option>
              </select>
            </label>

            {customerMode === "existing" ? (
              <div className="grid gap-1.5 text-sm">
                <span className="font-medium">Find customer</span>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Type a name or email…"
                  value={custQuery}
                  onChange={(e) => {
                    setCustQuery(e.target.value);
                    setPickedCustomerId("");
                  }}
                  autoComplete="off"
                  aria-label="Search customers"
                />
                <input type="hidden" name="existingCustomerId" value={pickedCustomerId} />
                {pickedCustomerId ? (
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                    Selected — change the search above to pick someone else.
                  </p>
                ) : null}
                <ul
                  className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] text-sm"
                  role="listbox"
                  aria-label="Matching customers"
                >
                  {filteredCustomers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left transition hover:bg-[var(--surface-hover)]"
                        onClick={() => {
                          setPickedCustomerId(c.id);
                          setCustQuery(`${c.fullName} (${c.email})`);
                        }}
                      >
                        <span className="font-medium text-[var(--foreground)]">{c.fullName}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">{c.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {customerMode === "new" ? (
              <>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Name</span>
                  <input name="customerName" required className="ui-input" autoComplete="name" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Email</span>
                  <input name="customerEmail" type="email" required className="ui-input" autoComplete="email" />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_80%,transparent)]">
                    Phone <span className="font-normal">(optional)</span>
                  </span>
                  <input name="customerPhone" type="tel" className="ui-input" autoComplete="tel" />
                </label>
              </>
            ) : null}

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">First service (sets the start time)</span>
              <select
                className="ui-input"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                aria-label="Primary service"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {services.filter((s) => s.id !== serviceId).length > 0 ? (
              <fieldset className="grid gap-2 text-sm">
                <legend className="font-medium">Same visit — add more (back-to-back)</legend>
                <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                  Extra services follow immediately after the first, including buffers.
                </p>
                {services
                  .filter((s) => s.id !== serviceId)
                  .map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={extraIds.includes(s.id)}
                        onChange={(e) => {
                          setExtraIds((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                          );
                        }}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
              </fieldset>
            ) : null}

            {estimate ? (
              <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-3 py-2 text-sm">
                <div className="font-medium text-[var(--foreground)]">Pricing estimate</div>
                <ul className="mt-1 space-y-0.5 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                  {estimate.lines.map((l) => (
                    <li key={l.name} className="flex justify-between gap-2">
                      <span>{l.name}</span>
                      <span className="tabular-nums">{formatMoney(l.amount, estimate.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 font-semibold text-[var(--foreground)]">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(estimate.total, estimate.currency)}</span>
                </div>
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Date</span>
              <input
                name="dateISO"
                type="date"
                required
                className="ui-input"
                min={minDateISO}
                max={maxDateISO}
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Time</span>
              {slotsLoading ? (
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">Loading times…</p>
              ) : slotsError ? (
                <p className="text-sm text-[var(--error)]">{slotsError}</p>
              ) : slotOptions.length === 0 ? (
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                  No open slots on this day. Pick another date.
                </p>
              ) : (
                <select
                  name="slotStart"
                  required
                  className="ui-input"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                >
                  <option value="">Choose a time…</option>
                  {slotOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_80%,transparent)]">
                Notes <span className="font-normal">(optional)</span>
              </span>
              <textarea name="notes" rows={3} className="ui-textarea" placeholder="Visible on the booking" />
            </label>

            <fieldset className="grid gap-2 text-sm">
              <legend className="font-medium">Payment status</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="unpaid"
                  checked={paymentStatus === "unpaid"}
                  onChange={() => setPaymentStatus("unpaid")}
                />
                Unpaid
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="paid"
                  checked={paymentStatus === "paid"}
                  onChange={() => setPaymentStatus("paid")}
                />
                Paid
              </label>
            </fieldset>

            {showPayMethods ? (
              <fieldset className="grid gap-2 text-sm">
                <legend className="font-medium">How was it paid?</legend>
                <label className="flex items-center gap-2">
                  <input type="radio" name="paymentMethod" value="cash" required />
                  Cash
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="paymentMethod" value="etransfer" required />
                  E-transfer
                </label>
              </fieldset>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-btn-secondary min-h-11 px-4 text-sm font-semibold"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  pending ||
                  slotsLoading ||
                  !slotStart ||
                  (customerMode === "existing" && !pickedCustomerId)
                }
                className="ui-btn-primary min-h-11 px-5 text-sm font-semibold"
              >
                {pending ? "Saving…" : "Create booking"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </ManualBookingOpenContext.Provider>
  );
}

export function ManualBookingHeaderButton({ className }: { className?: string }) {
  const open = useOpenManualBookingModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className={
        className ??
        "ui-btn-primary inline-flex min-h-10 shrink-0 items-center justify-center px-4 text-sm font-semibold"
      }
    >
      Add booking
    </button>
  );
}

export function ManualBookingEmptyButton({ className }: { className?: string }) {
  const open = useOpenManualBookingModal();
  return (
    <button type="button" onClick={() => open()} className={className}>
      Add a booking manually
    </button>
  );
}
