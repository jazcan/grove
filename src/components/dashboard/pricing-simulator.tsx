"use client";

import { useMemo, useState } from "react";
import type { TemplateAddOn } from "@/platform/templates/structure";
import { simulateServicePrice } from "@/domain/pricing/engine";

export type SimulatorService = {
  id: string;
  name: string;
  priceAmount: string;
  pricingType: "fixed" | "hourly";
  currency: string;
  canonicalAddOns: TemplateAddOn[] | null;
};

export type SimulatorTier = {
  id: string;
  label: string;
  multiplier: string;
};

export type OverrideRow = {
  addOnId: string;
  enabled: boolean;
  priceOverride: string | null;
};

export function PricingSimulator({
  services,
  tiers,
  overrideByService,
}: {
  services: SimulatorService[];
  tiers: SimulatorTier[];
  overrideByService: Record<string, OverrideRow[]>;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  const svc = services.find((s) => s.id === serviceId);
  const tier = tiers.find((t) => t.id === tierId);
  const mult = tier ? Number(tier.multiplier) : 1;

  const overridesMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    const list = serviceId ? overrideByService[serviceId] ?? [] : [];
    for (const r of list) {
      m.set(r.addOnId, r);
    }
    return m;
  }, [serviceId, overrideByService]);

  const disabledAddOnIds = useMemo(() => {
    const d = new Set<string>();
    if (!svc?.canonicalAddOns) return d;
    for (const a of svc.canonicalAddOns) {
      const o = overridesMap.get(a.id);
      if (o && !o.enabled) d.add(a.id);
    }
    return d;
  }, [svc, overridesMap]);

  const priceOverrides = useMemo(() => {
    const o: Record<string, string | null> = {};
    if (!svc?.canonicalAddOns) return o;
    for (const a of svc.canonicalAddOns) {
      const row = overridesMap.get(a.id);
      o[a.id] = row?.priceOverride ?? null;
    }
    return o;
  }, [svc, overridesMap]);

  const result = useMemo(() => {
    if (!svc) return null;
    return simulateServicePrice({
      serviceBaseAmount: svc.priceAmount,
      pricingType: svc.pricingType,
      tierMultiplier: Number.isFinite(mult) && mult > 0 ? mult : 1,
      currency: svc.currency,
      canonicalAddOns: svc.canonicalAddOns ?? [],
      selectedAddOnIds: Array.from(selectedAddOns),
      priceOverrides,
      disabledAddOnIds,
    });
  }, [svc, mult, selectedAddOns, priceOverrides, disabledAddOnIds]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!services.length) {
    return (
      <div className="ui-card p-6 text-sm text-[var(--muted)]">
        Add a service first to run simulations.
      </div>
    );
  }

  return (
    <div className="ui-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Simulation</h2>
      <p className="ui-hint mt-2 max-w-prose">
        See how positioning tiers and optional add-ons combine with your list price (template-backed add-ons come from
        the canonical service definition).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Service</span>
          <select
            className="ui-input mt-1"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSelectedAddOns(new Set());
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field text-sm">
          <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Positioning tier</span>
          <select className="ui-input mt-1" value={tierId} onChange={(e) => setTierId(e.target.value)}>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} (×{t.multiplier})
              </option>
            ))}
          </select>
        </label>
      </div>

      {svc?.canonicalAddOns && svc.canonicalAddOns.length > 0 ? (
        <div className="mt-6">
          <div className="text-sm font-semibold text-[var(--foreground)]">Add-ons (optional)</div>
          <ul className="mt-3 space-y-2">
            {svc.canonicalAddOns.map((a) => {
              const off = overridesMap.get(a.id);
              const disabled = off && !off.enabled;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAddOns.has(a.id)}
                      onChange={() => toggleAddOn(a.id)}
                      disabled={disabled}
                    />
                    <span className={disabled ? "text-[var(--muted)] line-through" : ""}>{a.label}</span>
                  </label>
                  {a.suggestedPrice ? (
                    <span className="text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">
                      suggested {svc.currency} {a.suggestedPrice}
                      {off?.priceOverride ? ` · your override ${off.priceOverride}` : ""}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--muted)]">This service has no template add-ons.</p>
      )}

      {result ? (
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Estimated total</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {result.currency}{" "}
            {result.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {result.lineItems[0]?.kind === "base" && svc?.pricingType === "hourly" ? " /hr (starting)" : ""}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
            {result.lineItems.map((line, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span className="tabular-nums">
                  {result.currency}{" "}
                  {line.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
