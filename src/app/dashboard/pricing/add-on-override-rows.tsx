"use client";

import { useActionState } from "react";
import { CsrfField } from "@/components/csrf-field";
import { upsertServiceAddOnOverride } from "@/actions/pricing";
import type { SimulatorService } from "@/components/dashboard/pricing-simulator";
import type { ActionState } from "@/domain/auth/actions";
import type { TemplateAddOn } from "@/platform/templates/structure";

function OverrideRowForm({
  csrf,
  serviceId,
  addOn,
  defaultEnabled,
  defaultPrice,
  rowIndex,
  rowCount,
}: {
  csrf: string;
  serviceId: string;
  addOn: TemplateAddOn;
  defaultEnabled: boolean;
  defaultPrice: string;
  rowIndex: number;
  rowCount: number;
}) {
  type AddOnAction = (prev: ActionState | null, fd: FormData) => Promise<ActionState>;
  const [state, action, pending] = useActionState(
    upsertServiceAddOnOverride as unknown as AddOnAction,
    null
  );

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 border-b border-[color-mix(in_oklab,var(--foreground)_6%,var(--border))] py-3 last:border-b-0"
    >
      <CsrfField token={csrf} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="addOnId" value={addOn.id} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-[var(--foreground)]">{addOn.label}</div>
        {rowCount > 1 ? (
          <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
            Line {rowIndex + 1} of {rowCount}
          </div>
        ) : null}
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
  type Row = {
    serviceId: string;
    serviceName: string;
    addOn: TemplateAddOn;
    defaultEnabled: boolean;
    defaultPrice: string;
  };

  const byService: { serviceId: string; serviceName: string; rows: Row[] }[] = [];

  for (const s of services) {
    if (!s.canonicalAddOns?.length) continue;
    const ov = overrides[s.id] ?? [];
    const ovMap = new Map(ov.map((o) => [o.addOnId, o]));
    const rows: Row[] = [];
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
    if (rows.length) byService.push({ serviceId: s.id, serviceName: s.name, rows });
  }

  if (!byService.length) {
    return (
      <section className="ui-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Add-on overrides</h2>
        <p className="ui-hint mt-2 max-w-prose">
          When a template includes optional add-ons, each one appears here so you can turn it off or set your own price.
          You&apos;ll get one row per add-on per service—save each row independently.
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">No template add-ons on your services yet.</p>
      </section>
    );
  }

  return (
    <section className="ui-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Add-on overrides</h2>
      <p className="ui-hint mt-2 max-w-prose">
        Each box is one service. Inside it, every template add-on gets its own row—adjust and press{" "}
        <span className="font-medium text-[var(--foreground)]">Save</span> on each line you change.
      </p>
      <div className="mt-6 space-y-6">
        {byService.map((group) => (
          <div
            key={group.serviceId}
            className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_2%,var(--card))] p-4 sm:p-5"
          >
            <h3 className="text-base font-semibold text-[var(--foreground)]">{group.serviceName}</h3>
            <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              {group.rows.length} add-on{group.rows.length === 1 ? "" : "s"} — multiple rows are normal when the template
              includes several options.
            </p>
            <div className="mt-3">
              {group.rows.map((r, i) => (
                <OverrideRowForm
                  key={`${r.serviceId}-${r.addOn.id}`}
                  csrf={csrf}
                  serviceId={r.serviceId}
                  addOn={r.addOn}
                  defaultEnabled={r.defaultEnabled}
                  defaultPrice={r.defaultPrice}
                  rowIndex={i}
                  rowCount={group.rows.length}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
