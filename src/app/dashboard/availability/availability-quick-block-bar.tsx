"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { addBlockedTimeInline } from "@/actions/availability";
import { BlockTimeModal } from "./block-time-modal";
import { QuickBlockModal } from "./quick-block-modal";

type BlockResult = { ok: true } | { ok: false; error: string };

export function AvailabilityQuickBlockBar({ csrf, timezone }: { csrf: string; timezone: string }) {
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState<Date>(new Date());
  const [modalEnd, setModalEnd] = useState<Date>(new Date());
  const [quickBusy, setQuickBusy] = useState(false);
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

  const openBlockModal = useCallback((start: Date, end: Date) => {
    const s = start;
    let e = end;
    if (e <= s) {
      e = new Date(s.getTime() + 60 * 60 * 1000);
    }
    setModalStart(s);
    setModalEnd(e);
    setModalOpen(true);
  }, []);

  const runQuickNextHour = useCallback(async () => {
    setQuickBusy(true);
    setBarError(null);
    const now = DateTime.now().setZone(timezone);
    const rounded = now.set({
      minute: Math.floor(now.minute / 15) * 15,
      second: 0,
      millisecond: 0,
    });
    const start = rounded.toJSDate();
    const end = rounded.plus({ hours: 1 }).toJSDate();
    const r = await submitBlockRange(start, end, "");
    setQuickBusy(false);
    if (r.ok) setQuickOpen(false);
    else setBarError(r.error);
  }, [submitBlockRange, timezone]);

  const runQuickToday = useCallback(async () => {
    setQuickBusy(true);
    setBarError(null);
    const now = DateTime.now().setZone(timezone);
    const rounded = now.set({
      minute: Math.floor(now.minute / 15) * 15,
      second: 0,
      millisecond: 0,
    });
    const start = rounded.toJSDate();
    let end = now.endOf("day").toJSDate();
    if (end <= new Date(start.getTime() + 15 * 60 * 1000)) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    const r = await submitBlockRange(start, end, "");
    setQuickBusy(false);
    if (r.ok) setQuickOpen(false);
    else setBarError(r.error);
  }, [submitBlockRange, timezone]);

  const runQuickCustom = useCallback(() => {
    setQuickOpen(false);
    const now = DateTime.now().setZone(timezone);
    const rounded = now.set({
      minute: Math.floor(now.minute / 15) * 15,
      second: 0,
      millisecond: 0,
    });
    openBlockModal(rounded.toJSDate(), rounded.plus({ hours: 1 }).toJSDate());
  }, [timezone, openBlockModal]);

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
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--foreground)_55%,transparent)]">
            Quick block
          </div>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Fastest path for emergencies and last-minute changes — often one tap.
          </p>
        </div>
        <button
          type="button"
          className="ui-btn-primary min-h-11 w-full shrink-0 px-6 text-sm font-semibold sm:w-auto"
          onClick={() => {
            setBarError(null);
            setQuickOpen(true);
          }}
        >
          Quick block
        </button>
      </div>
      {barError ? (
        <p className="mt-3 rounded-lg bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)] ring-1 ring-[var(--error-border)]" role="alert">
          {barError}
        </p>
      ) : null}

      <QuickBlockModal
        open={quickOpen}
        onClose={() => {
          if (!quickBusy) setQuickOpen(false);
        }}
        busy={quickBusy}
        onBlockNextHour={() => void runQuickNextHour()}
        onBlockToday={() => void runQuickToday()}
        onCustom={runQuickCustom}
      />

      <BlockTimeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        timezone={timezone}
        initialStart={modalStart}
        initialEnd={modalEnd}
        onConfirm={confirmBlock}
      />
    </div>
  );
}
