"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteBlockedTimeInline } from "@/actions/availability";

type BlockRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function formatBlockRange(b: BlockRow, timezone: string): string {
  const s = DateTime.fromJSDate(b.startsAt).setZone(timezone);
  const e = DateTime.fromJSDate(b.endsAt).setZone(timezone);
  const sameDay = s.toISODate() === e.toISODate();
  if (sameDay) {
    return `${s.toFormat("MMM d")} · ${s.toFormat("h:mm a")} – ${e.toFormat("h:mm a")}`;
  }
  return `${s.toFormat("MMM d, h:mm a")} – ${e.toFormat("MMM d, h:mm a")}`;
}

export function BlockedTimeList({ blocks, timezone, csrf }: { blocks: BlockRow[]; timezone: string; csrf: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const remove = (id: string) => {
    const fd = new FormData();
    fd.set("csrf", csrf);
    fd.set("id", id);
    startTransition(async () => {
      const r = await deleteBlockedTimeInline(fd);
      if (r.ok) router.refresh();
    });
  };

  if (!blocks.length) {
    return (
      <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        Nothing blocked yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {blocks.map((b) => (
        <li
          key={b.id}
          className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] px-4 py-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--error)_12%,var(--card))] text-[var(--error)] ring-1 ring-[color-mix(in_oklab,var(--error)_22%,var(--border))]">
              <IconClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--foreground)]">{formatBlockRange(b, timezone)}</p>
              {b.reason ? (
                <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">{b.reason}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="ui-btn-secondary min-h-10 shrink-0 self-start px-4 text-sm font-semibold text-[var(--error)] ring-[color-mix(in_oklab,var(--error)_25%,var(--border))] sm:self-center"
            disabled={pending}
            onClick={() => remove(b.id)}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
