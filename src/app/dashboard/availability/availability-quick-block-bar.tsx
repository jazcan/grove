"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { addBlockedTimeInline } from "@/actions/availability";
import { BlockTimeModal } from "./block-time-modal";

type BlockResult = { ok: true } | { ok: false; error: string };

export function AvailabilityQuickBlockBar({ csrf, timezone }: { csrf: string; timezone: string }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState<Date>(new Date());
  const [modalEnd, setModalEnd] = useState<Date>(new Date());
  const [barError, setBarError] = useState<string | null>(null);

  const submitBlockRange = useCallback(
    async (startsAt: Date, endsAt: Date, reason: string): Promise<BlockResult> => {
      const s = startsAt;
      let e = endsAt;
      if (e <= s) {
        e = new Date(s.getTime() + 60 * 60 * 1000);
      }
      const fd = new FormData();
      fd.set("csrf", csrf);
      fd.set("startsAt", s.toISOString());
      fd.set("endsAt", e.toISOString());
      fd.set("reason", reason);
      const r = await addBlockedTimeInline(fd);
      if (!r.ok) return { ok: false as const, error: r.error };
      router.refresh();
      return { ok: true as const };
    },
    [csrf, router]
  );

  const openQuickBlockModal = useCallback(() => {
    setBarError(null);
    const now = DateTime.now().setZone(timezone);
    let start = now.set({ minute: 0, second: 0, millisecond: 0 });
    if (now > start) start = start.plus({ hours: 1 });
    const end = start.plus({ hours: 1 });
    setModalStart(start.toJSDate());
    setModalEnd(end.toJSDate());
    setModalOpen(true);
  }, [timezone]);

  const confirmBlock = useCallback(
    async (payload: { startsAt: Date; endsAt: Date; reason: string }) => {
      const r = await submitBlockRange(payload.startsAt, payload.endsAt, payload.reason);
      if (!r.ok) return { ok: false as const, error: r.error };
      return { ok: true as const };
    },
    [submitBlockRange]
  );

  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-[var(--foreground)]">Quick block</div>
        <button
          type="button"
          className="ui-btn-primary min-h-11 w-full shrink-0 px-6 text-sm font-semibold sm:w-auto"
          onClick={openQuickBlockModal}
        >
          Block time…
        </button>
      </div>
      {barError ? (
        <p className="mt-3 rounded-lg bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)] ring-1 ring-[var(--error-border)]" role="alert">
          {barError}
        </p>
      ) : null}

      <BlockTimeModal open={modalOpen} onClose={() => setModalOpen(false)} timezone={timezone} initialStart={modalStart} initialEnd={modalEnd} onConfirm={confirmBlock} />
    </div>
  );
}
