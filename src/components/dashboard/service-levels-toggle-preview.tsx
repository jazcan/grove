"use client";

import { useState } from "react";

type Props = {
  defaultChecked: boolean;
  tierLabels: string[];
};

export function ServiceLevelsTogglePreview({ defaultChecked, tierLabels }: Props) {
  const [on, setOn] = useState(defaultChecked);
  const labels = tierLabels.length ? tierLabels : ["Standard", "Enhanced", "Premium"];

  return (
    <div className="grid gap-3">
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input
          type="checkbox"
          name="serviceLevelsEnabled"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-1"
        />
        <span>Enable service levels for this service</span>
      </label>
      {on ? (
        <div
          className="rounded-lg bg-[color-mix(in_oklab,var(--foreground)_16%,var(--card))] px-4 py-3 text-sm text-[color-mix(in_oklab,var(--background)_88%,var(--foreground))]"
          aria-live="polite"
        >
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Preview</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {labels.map((label) => (
              <li
                key={label}
                className="rounded-md bg-[color-mix(in_oklab,var(--foreground)_22%,transparent)] px-3 py-1.5 font-medium"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
