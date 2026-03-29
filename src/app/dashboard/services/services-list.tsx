"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { asFormAction } from "@/lib/form-action";
import { CsrfField } from "@/components/csrf-field";
import { updateService, deleteService } from "@/actions/services";

export type ServiceRowForUI = {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  pricingType: "fixed" | "hourly";
  priceAmount: string;
  currency: string;
  prepInstructions: string;
  isActive: boolean;
};

function formatPrice(s: ServiceRowForUI): string {
  const label = s.pricingType === "hourly" ? "/hr" : "";
  const cur = (s.currency || "CAD").toUpperCase();
  return `${cur} ${s.priceAmount}${label}`;
}

export function ServicesList({
  services,
  csrf,
}: {
  services: ServiceRowForUI[];
  csrf: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  if (!services.length) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] px-6 py-14 text-center shadow-[0_12px_40px_-24px_rgba(28,27,25,0.18)] sm:px-12">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Start earning — pick a proven service</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
          Scroll up, choose a template, and hit save—your first bookable offer appears here instantly.
        </p>
        <Link
          href="/dashboard/services?prefill=consultation-30#service-form"
          className="ui-btn-primary mt-8 inline-flex min-h-12 w-full max-w-sm items-center justify-center px-6 text-sm font-semibold sm:w-auto"
        >
          Use a popular template
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-5 sm:space-y-6">
      {services.map((s) => {
        const isOpen = openId === s.id;
        const full = byId.get(s.id)!;
        return (
          <li
            key={s.id}
            className="overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[var(--card)] shadow-[0_12px_40px_-22px_rgba(28,27,25,0.16)] transition-shadow duration-200 hover:shadow-[0_16px_44px_-20px_rgba(28,27,25,0.2)]"
          >
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-7">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <div className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">{s.name}</div>
                  <span
                    className={[
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      s.isActive
                        ? "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]",
                    ].join(" ")}
                  >
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                  <span className="tabular-nums">{s.durationMinutes} min</span>
                  <span className="tabular-nums">{formatPrice(s)}</span>
                  {s.category ? <span className="min-w-0 truncate">{s.category}</span> : null}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:min-w-[200px] sm:flex-col sm:items-stretch">
                <button
                  type="button"
                  onClick={() => setOpenId((v) => (v === s.id ? null : s.id))}
                  className="ui-btn-primary min-h-11 w-full px-4 py-2.5 text-sm font-semibold"
                >
                  {isOpen ? "Close editor" : "Edit"}
                </button>
                <form action={asFormAction(deleteService)}>
                  <CsrfField token={csrf} />
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_4%,var(--card))] px-3 py-2.5 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[color-mix(in_oklab,var(--error)_8%,var(--card))]"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>

            {isOpen ? (
              <div className="border-t border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-5 sm:p-6">
                <form action={asFormAction(updateService)} className="grid gap-6">
                  <CsrfField token={csrf} />
                  <input type="hidden" name="id" value={s.id} />

                  <section className="grid gap-3">
                    <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
                      Basic info
                    </div>
                    <div className="grid gap-3">
                      <input
                        name="name"
                        defaultValue={full.name}
                        className="rounded border px-3 py-2"
                        required
                      />
                      <textarea
                        name="description"
                        defaultValue={full.description}
                        rows={4}
                        className="rounded border px-3 py-2"
                      />
                      <input
                        name="category"
                        defaultValue={full.category}
                        className="rounded border px-3 py-2"
                      />
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
                      Duration & buffer
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                          Duration (minutes)
                        </span>
                        <input
                          name="durationMinutes"
                          type="number"
                          min={5}
                          defaultValue={full.durationMinutes}
                          className="rounded border px-3 py-2"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                          Buffer (minutes)
                        </span>
                        <input
                          name="bufferMinutes"
                          type="number"
                          min={0}
                          defaultValue={full.bufferMinutes}
                          className="rounded border px-3 py-2"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
                      Pricing
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="grid gap-1 text-sm sm:col-span-1">
                        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                          Type
                        </span>
                        <select
                          name="pricingType"
                          defaultValue={full.pricingType}
                          className="rounded border px-3 py-2"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="hourly">Hourly</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-1">
                        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                          Price
                        </span>
                        <input
                          name="priceAmount"
                          defaultValue={full.priceAmount}
                          className="rounded border px-3 py-2"
                        />
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-1">
                        <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                          Currency
                        </span>
                        <input
                          name="currency"
                          defaultValue={full.currency ?? "CAD"}
                          className="rounded border px-3 py-2"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
                      Before the appointment (optional)
                    </div>
                    <textarea
                      name="prepInstructions"
                      defaultValue={full.prepInstructions}
                      rows={3}
                      className="ui-textarea"
                    />
                  </section>

                  <section className="grid gap-3">
                    <div className="text-sm font-semibold text-[color-mix(in_oklab,var(--foreground)_88%,transparent)]">
                      Make this service available to clients
                    </div>
                    <label className="flex items-start gap-3 text-sm leading-snug">
                      <input type="checkbox" name="isActive" defaultChecked={full.isActive} className="mt-1" />
                      <span>Active — clients can see and book this when your profile is live</span>
                    </label>
                  </section>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_60%,transparent)]">
                      Tip: keep descriptions short and scannable.
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded bg-[var(--accent)] px-4 py-2 text-sm text-white sm:w-auto"
                    >
                      Save service
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

