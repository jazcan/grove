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
import { createManualBooking, fetchManualBookingSlots } from "@/actions/booking-dashboard";
import { CsrfField } from "@/components/csrf-field";

type ServiceOpt = { id: string; name: string };
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
  children: ReactNode;
};

export function ManualBookingModalRoot({
  csrf,
  services,
  customers,
  timezone,
  minDateISO,
  maxDateISO,
  children,
}: RootProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(createManualBooking, undefined);
  const open = useCallback(() => dialogRef.current?.showModal(), []);

  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "walkin">(
    customers.length > 0 ? "existing" : "new"
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [dateISO, setDateISO] = useState(minDateISO);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | undefined>();
  const [slotStart, setSlotStart] = useState("");

  useEffect(() => {
    if (state?.success) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [state?.success, router]);

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

  const hasServices = services.length > 0;

  return (
    <ManualBookingOpenContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className="w-[min(100%,26rem)] max-w-[calc(100vw-2rem)] rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] backdrop:bg-black/40"
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
          <form action={formAction} className="grid max-h-[min(70vh,32rem)] gap-4 overflow-y-auto px-6 py-5">
            <CsrfField token={csrf} />
            <input type="hidden" name="customerMode" value={customerMode} />

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
                }}
                aria-label="Customer source"
              >
                {customers.length > 0 ? <option value="existing">Existing customer</option> : null}
                <option value="new">New customer</option>
                <option value="walkin">No client (walk-in)</option>
              </select>
            </label>

            {customerMode === "existing" ? (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Select customer</span>
                <select name="existingCustomerId" required className="ui-input" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </label>
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
              <span className="font-medium">Service</span>
              <select
                name="serviceId"
                required
                className="ui-input"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

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
                <input type="radio" name="paymentStatus" value="unpaid" defaultChecked />
                Unpaid
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="paymentStatus" value="paid" />
                Paid
              </label>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-btn-secondary min-h-11 px-4 text-sm font-semibold"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button type="submit" disabled={pending || slotsLoading || !slotStart} className="ui-btn-primary min-h-11 px-5 text-sm font-semibold">
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
