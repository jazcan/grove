"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { upsertServiceAddOnOverride } from "@/actions/pricing";
import type { SimulatorService } from "@/components/dashboard/pricing-simulator";
import type { ActionState } from "@/domain/auth/actions";
import type { TemplateAddOn } from "@/platform/templates/structure";

function Row({
  csrf,
  serviceId,
  serviceName,
  addOn,
  defaultEnabled,
  defaultPrice,
}: {
  csrf: string;
  serviceId: string;
  serviceName: string;
  addOn: TemplateAddOn;
  defaultEnabled: boolean;
  defaultPrice: string;
}) {
  type AddOnAction = (prev: ActionState | null, fd: FormData) => Promise<ActionState>;
  const [state, action, pending] = useActionState(
    upsertServiceAddOnOverride as unknown as AddOnAction,
    null
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <CsrfField token={csrf} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="addOnId" value={addOn.id} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-[var(--foreground)]">{serviceName}</div>
        <div className="text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">{addOn.label}</div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={defaultEnabled} className="rounded" />
        Offered
      </label>
      <label className="ui-field min-w-[7rem] text-sm">
        <span className="sr-only">Override price</span>
        <input
          name="priceOverride"
          className="ui-input"
          placeholder="Override"
          defaultValue={defaultPrice}
          aria-label={`Override price for ${addOn.label}`}
        />
      </label>
      <button type="submit" disabled={pending} className="ui-btn-secondary min-h-10 px-3 text-sm">
        {pending ? "…" : "Save"}
      </button>
      {state?.error ? <span className="w-full text-xs text-red-600">{state.error}</span> : null}
      {state?.success ? (
        <span className="w-full text-xs text-[var(--success)]" role="status">
          {state.success}
        </span>
      ) : null}
    </form>
  );
}

export function AddOnOverrideRows({
  services,
  overrides,
  csrf,
}: {
  services: SimulatorService[];
  overrides: Record<string, { addOnId: string; enabled: boolean; priceOverride: string | null }[]>;
  csrf: string;
}) {
  const rows: {
    serviceId: string;
    serviceName: string;
    addOn: TemplateAddOn;
    defaultEnabled: boolean;
    defaultPrice: string;
  }[] = [];

  for (const s of services) {
    if (!s.canonicalAddOns?.length) continue;
    const ov = overrides[s.id] ?? [];
    const ovMap = new Map(ov.map((o) => [o.addOnId, o]));
    for (const a of s.canonicalAddOns) {
      const o = ovMap.get(a.id);
      rows.push({
        serviceId: s.id,
        serviceName: s.name,
        addOn: a,
        defaultEnabled: o?.enabled ?? true,
        defaultPrice: o?.priceOverride ?? "",
      });
    }
  }

  if (!rows.length) {
    return (
      <section className="ui-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Add-on overrides</h2>
        <p className="ui-hint mt-2">
          When your template includes add-ons, you can disable them or set a custom price per service here.
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">No template add-ons on your services yet.</p>
      </section>
    );
  }

  return (
    <section className="ui-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Add-on overrides</h2>
      <p className="ui-hint mt-2 max-w-prose">
        Per service variant: turn add-ons off or override the suggested price from the canonical template.
      </p>
      <div className="mt-4">
        {rows.map((r) => (
          <Row
            key={`${r.serviceId}-${r.addOn.id}`}
            csrf={csrf}
            serviceId={r.serviceId}
            serviceName={r.serviceName}
            addOn={r.addOn}
            defaultEnabled={r.defaultEnabled}
            defaultPrice={r.defaultPrice}
          />
        ))}
      </div>
    </section>
  );
}
