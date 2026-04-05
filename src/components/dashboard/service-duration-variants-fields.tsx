"use client";

import { useCallback, useRef, useState } from "react";

export type VariantRowDefaults = {
  durationMinutes: number;
  bufferMinutes: number;
  priceAmount: string;
};

type Row = VariantRowDefaults & { id: string };

const MAX_VARIANTS = 6;

function makeRow(id: string, partial: Partial<VariantRowDefaults> = {}): Row {
  return {
    id,
    durationMinutes: partial.durationMinutes ?? 60,
    bufferMinutes: partial.bufferMinutes ?? 10,
    priceAmount: partial.priceAmount ?? "50.00",
  };
}

type Props = {
  /** First row seeds from template or scratch defaults. */
  initialRow: VariantRowDefaults;
};

export function ServiceDurationVariantsFields({ initialRow }: Props) {
  const seq = useRef(1);
  const [rows, setRows] = useState<Row[]>(() => [makeRow("0", initialRow)]);

  const addVariant = useCallback(() => {
    setRows((prev) => {
      if (prev.length >= MAX_VARIANTS) return prev;
      const last = prev[prev.length - 1];
      seq.current += 1;
      return [...prev, makeRow(String(seq.current), { bufferMinutes: last.bufferMinutes, priceAmount: last.priceAmount })];
    });
  }, []);

  const removeVariant = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const patchRow = useCallback((id: string, patch: Partial<VariantRowDefaults>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-[color-mix(in_oklab,var(--foreground)_10%,var(--border))] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--card))] p-4 sm:p-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
              {rows.length > 1 ? `Option ${index + 1}` : "Time & price"}
            </span>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeVariant(row.id)}
                className="text-sm font-medium text-[color-mix(in_oklab,var(--foreground)_65%,transparent)] underline decoration-[color-mix(in_oklab,var(--foreground)_25%,transparent)] underline-offset-2 hover:text-[var(--foreground)]"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Duration (minutes)</span>
              <input
                name={`variant_${index}_durationMinutes`}
                type="number"
                min={5}
                value={row.durationMinutes}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchRow(row.id, { durationMinutes: Number.isFinite(n) ? Math.max(5, n) : 5 });
                }}
                className="ui-input mt-1 rounded-xl"
              />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Buffer (minutes)</span>
              <input
                name={`variant_${index}_bufferMinutes`}
                type="number"
                min={0}
                value={row.bufferMinutes}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchRow(row.id, { bufferMinutes: Number.isFinite(n) ? Math.max(0, n) : 0 });
                }}
                className="ui-input mt-1 rounded-xl"
              />
            </label>
            <label className="ui-field text-sm">
              <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">Price</span>
              <input
                name={`variant_${index}_priceAmount`}
                value={row.priceAmount}
                onChange={(e) => patchRow(row.id, { priceAmount: e.target.value })}
                placeholder="0.00"
                className="ui-input mt-1 rounded-xl"
              />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addVariant}
          disabled={rows.length >= MAX_VARIANTS}
          className="ui-btn-secondary inline-flex min-h-10 w-full items-center justify-center px-4 text-sm font-semibold sm:w-auto disabled:opacity-45"
        >
          + Add variant
        </button>
        {rows.length >= MAX_VARIANTS ? (
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">Up to {MAX_VARIANTS} options per save.</p>
        ) : (
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
            Each option becomes its own bookable service (same details, different time and price).
          </p>
        )}
      </div>
    </div>
  );
}
