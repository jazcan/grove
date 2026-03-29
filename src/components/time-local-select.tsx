"use client";

import { getHalfHourTimeOptions, normalizeTimeLocalForSelect, optionForNonStandardTime } from "@/lib/time-options";

export function TimeLocalSelect({
  name,
  defaultValue,
  className = "ui-input mt-1",
}: {
  name: string;
  defaultValue: string;
  className?: string;
}) {
  const normalized = normalizeTimeLocalForSelect(defaultValue);
  const standard = getHalfHourTimeOptions();
  const extra = optionForNonStandardTime(normalized, standard);

  return (
    <select name={name} defaultValue={normalized} className={className}>
      {extra ? (
        <option key={extra.value} value={extra.value}>
          {extra.label}
        </option>
      ) : null}
      {standard.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
