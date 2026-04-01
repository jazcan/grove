"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { dismissPublicBookingFailureSignalAction } from "@/actions/dashboard-signals";
import {
  BOOKING_FAILED_SIGNAL_KIND,
  type PresentedProviderSignal,
  type ProviderSignalCta,
} from "@/domain/provider-dashboard-signals.shared";
import { SignalDismissButton } from "@/components/dashboard/signal-dismiss-button";

function ctaForOccurrence(email: string | null, phone: string | null): ProviderSignalCta | null {
  if (email?.trim()) {
    return { label: "Contact customer", href: `mailto:${encodeURIComponent(email.trim())}` };
  }
  if (phone?.trim()) {
    const digits = phone.replace(/[^\d+]/g, "");
    return digits ? { label: "Contact customer", href: `tel:${digits}` } : null;
  }
  return null;
}

type Props = {
  signal: PresentedProviderSignal;
  csrfToken: string;
};

export function AttentionSignalCard({ signal, csrfToken }: Props) {
  const occurrences = signal.occurrences;
  const [idx, setIdx] = useState(0);
  const total = occurrences.length;
  const current = occurrences[Math.min(idx, total - 1)] ?? occurrences[0];
  const showNav = total > 1;

  const slideCta = useMemo(() => {
    const fromSlide = ctaForOccurrence(current?.email ?? null, current?.phone ?? null);
    if (fromSlide) return fromSlide;
    return signal.cta;
  }, [current?.email, current?.phone, signal.cta]);

  const go = (delta: number) => {
    setIdx((i) => {
      const next = i + delta;
      if (next < 0) return total - 1;
      if (next >= total) return 0;
      return next;
    });
  };

  const seenLabel =
    current?.seenAtIso != null
      ? new Date(current.seenAtIso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <li className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{signal.title}</h3>
        {showNav ? (
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 text-xs tabular-nums text-[var(--muted)]">
              {idx + 1} of {total}
            </span>
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/50 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              aria-label="Previous occurrence"
            >
              <span aria-hidden className="text-sm leading-none">
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/50 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              aria-label="Next occurrence"
            >
              <span aria-hidden className="text-sm leading-none">
                ›
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <p className="ui-hint mt-2 text-sm leading-relaxed">{signal.description}</p>

      <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-[color-mix(in_oklab,var(--surface-muted)_40%,var(--card))] p-3 sm:p-4" aria-live="polite">
        {seenLabel ? (
          <p className="text-xs font-medium text-[var(--muted)]">
            This attempt · <time dateTime={current?.seenAtIso}>{seenLabel}</time>
          </p>
        ) : null}

        {current?.isInferred ? (
          <p className="ui-hint mt-2 text-sm leading-relaxed">
            We don&apos;t have separate contact details for this attempt—double-check your public booking page and
            availability so the next person gets through.
          </p>
        ) : null}

        {(current?.email || current?.phone) && !current?.isInferred ? (
          <p className="mt-3 text-sm text-[var(--foreground)]">
            {current.email ? (
              <span>
                Email:{" "}
                <a href={`mailto:${encodeURIComponent(current.email)}`} className="ui-link font-medium">
                  {current.email}
                </a>
              </span>
            ) : null}
            {current.email && current.phone ? <span className="mx-2 text-[var(--muted)]">·</span> : null}
            {current.phone ? (
              <span>
                Phone:{" "}
                <a href={`tel:${current.phone.replace(/[^\d+]/g, "")}`} className="ui-link font-medium">
                  {current.phone}
                </a>
              </span>
            ) : null}
          </p>
        ) : null}

        {current?.errorSnippet ? (
          <p className="ui-hint mt-3 text-xs leading-relaxed">
            <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">Note: </span>
            {current.errorSnippet}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>
          <span className="font-medium text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
            {signal.occurrenceCount}
          </span>{" "}
          {signal.occurrenceCount === 1 ? "attempt" : "attempts"} total
        </span>
        <span>
          Last activity{" "}
          {new Date(signal.lastSeenAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {slideCta ? (
          slideCta.href.startsWith("mailto:") || slideCta.href.startsWith("tel:") ? (
            <a
              href={slideCta.href}
              className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
            >
              {slideCta.label}
            </a>
          ) : (
            <Link
              href={slideCta.href}
              className="ui-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
            >
              {slideCta.label}
            </Link>
          )
        ) : null}
        {signal.secondaryCta ? (
          <Link
            href={signal.secondaryCta.href}
            className="ui-btn-secondary inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline"
          >
            {signal.secondaryCta.label}
          </Link>
        ) : null}
        {signal.signalKind === BOOKING_FAILED_SIGNAL_KIND ? (
          <form action={dismissPublicBookingFailureSignalAction} className="inline-flex">
            <input type="hidden" name="csrf" value={csrfToken} />
            <SignalDismissButton />
          </form>
        ) : null}
      </div>
    </li>
  );
}
