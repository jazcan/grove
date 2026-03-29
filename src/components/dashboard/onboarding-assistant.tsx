"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroveLogoMark } from "@/components/brand/grove-logo-mark";
import { getAssistantRouteId, getPageGuide, type AssistantRouteId } from "@/lib/onboarding-assistant-content";
import { buildProviderSetupSteps, type ProviderSetupState } from "@/lib/provider-setup-model";

const STORAGE_KEY = "grove.dashboardGuide.ui.v1";

type StoredUi = "open" | "minimized";

function readStored(): StoredUi | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === "open" || raw === "minimized") return raw;
  return null;
}

function writeStored(value: StoredUi) {
  sessionStorage.setItem(STORAGE_KEY, value);
}

function routeMatchesStep(routeId: AssistantRouteId, stepKey: string): boolean {
  if (stepKey === "services") return routeId === "services";
  if (stepKey === "availability") return routeId === "availability";
  if (stepKey === "publish") return routeId === "profile";
  return false;
}

function onStepShortCta(stepKey: string): string {
  switch (stepKey) {
    case "services":
      return "Add a bookable service";
    case "availability":
      return "Set working hours";
    case "publish":
      return "Publish your profile";
    default:
      return "Continue";
  }
}

function completePrimaryCta(routeId: AssistantRouteId): { label: string; href: string } {
  switch (routeId) {
    case "dashboard":
      return { label: "View bookings", href: "/dashboard/bookings" };
    case "services":
      return { label: "Refine services", href: "/dashboard/services" };
    case "availability":
      return { label: "Adjust calendar", href: "/dashboard/availability" };
    case "profile":
      return { label: "Profile settings", href: "/dashboard/profile" };
    case "pricing":
      return { label: "Back to services", href: "/dashboard/services" };
    case "bookings":
      return { label: "Open customers", href: "/dashboard/customers" };
    case "customers":
      return { label: "Open marketing", href: "/dashboard/marketing" };
    case "marketing":
      return { label: "View analytics", href: "/dashboard/analytics" };
    case "analytics":
      return { label: "Command center", href: "/dashboard" };
    case "onboarding":
      return { label: "Go to home", href: "/dashboard" };
    default:
      return { label: "Command center", href: "/dashboard" };
  }
}

export type DashboardOnboardingAssistantProps = {
  setup: ProviderSetupState | null;
  /** True when the server could not load setup (e.g. DB error); avoids misleading empty state. */
  setupLoadFailed?: boolean;
  /** No provider row yet (pre–account onboarding). */
  preProvider: boolean;
  initialExpanded: boolean;
  /**
   * Optional footer links (docs, contact, status). Wired for near-term support without changing the shell.
   */
  supportLinks?: { label: string; href: string }[];
};

export function DashboardOnboardingAssistant({
  setup,
  setupLoadFailed = false,
  preProvider,
  initialExpanded,
  supportLinks,
}: DashboardOnboardingAssistantProps) {
  const pathname = usePathname();
  const routeId = useMemo(() => getAssistantRouteId(pathname), [pathname]);
  const guide = useMemo(() => getPageGuide(routeId), [routeId]);

  const [expanded, setExpanded] = useState(initialExpanded);

  useEffect(() => {
    const stored = readStored();
    if (stored === "minimized") setExpanded(false);
    else if (stored === "open") setExpanded(true);
  }, []);

  const minimize = useCallback(() => {
    setExpanded(false);
    writeStored("minimized");
  }, []);

  const openPanel = useCallback(() => {
    setExpanded(true);
    writeStored("open");
  }, []);

  const steps = setup ? buildProviderSetupSteps(setup) : [];
  const nextIncomplete = steps.find((s) => !s.done) ?? null;
  const completedSetupSteps = setup ? steps.filter((s) => s.done).length : 0;
  const totalSetupSteps = steps.length;
  const progressPct =
    totalSetupSteps > 0 ? Math.round((completedSetupSteps / totalSetupSteps) * 100) : 0;

  const primaryCta = useMemo(() => {
    if (setupLoadFailed) {
      return { label: "Reload page", href: pathname || "/dashboard" };
    }
    if (preProvider || !setup) {
      if (routeId === "onboarding") {
        return { label: "Use the form below", href: "#main-content" };
      }
      return { label: "Finish account setup", href: "/dashboard/onboarding" };
    }
    if (nextIncomplete) {
      const onStep = routeMatchesStep(routeId, nextIncomplete.key);
      const label = onStep ? onStepShortCta(nextIncomplete.key) : `Next: ${nextIncomplete.cta}`;
      return { label, href: nextIncomplete.href };
    }
    return completePrimaryCta(routeId);
  }, [setupLoadFailed, preProvider, setup, nextIncomplete, routeId, pathname]);

  const showProgress = Boolean(setup) && !setupLoadFailed;

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6"
      data-grove-assistant
    >
      {expanded ? (
        <aside
          className="pointer-events-auto w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_96%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_92%,transparent)]"
          aria-label="Grove guide"
          role="complementary"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <GroveLogoMark size={36} className="shrink-0 shadow-[var(--shadow-sm)]" aria-hidden />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Grove guide</div>
                <div className="truncate text-sm font-semibold text-[var(--foreground)]">{guide.contextTitle}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={minimize}
              className="ui-btn-secondary min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              Minimize
            </button>
          </div>

          <div className="px-4 py-4">
            <p className="text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
              {guide.body}
            </p>

            {setupLoadFailed ? (
              <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                Couldn&apos;t load setup status. Check your database connection or environment, then reload.
              </div>
            ) : showProgress ? (
              <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]">
                  <span>Setup progress</span>
                  <span className="tabular-nums">{progressPct}%</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--card)] ring-1 ring-inset ring-[var(--card-border)]"
                  role="progressbar"
                  aria-valuenow={completedSetupSteps}
                  aria-valuemin={0}
                  aria-valuemax={totalSetupSteps}
                  aria-label={`Setup progress: ${completedSetupSteps} of ${totalSetupSteps} complete`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {nextIncomplete ? (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">Still to do: {nextIncomplete.label}</p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-[var(--success)]">You&apos;re ready to take bookings.</p>
                )}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={primaryCta.href}
                className="ui-btn-primary flex min-h-11 items-center justify-center px-4 text-center text-sm font-semibold no-underline"
              >
                {primaryCta.label}
              </Link>
            </div>

            {supportLinks && supportLinks.length > 0 ? (
              <ul className="mt-4 space-y-1.5 border-t border-[var(--card-border)] pt-3">
                {supportLinks.map((l) => (
                  <li key={`${l.href}-${l.label}`}>
                    <Link
                      href={l.href}
                      className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={openPanel}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-soft-border)] bg-[var(--card)] shadow-[var(--shadow-md)] transition-[transform,box-shadow] hover:bg-[var(--surface-hover)] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Open Grove guide"
          aria-expanded={false}
        >
          <GroveLogoMark size={40} className="shrink-0" aria-hidden />
        </button>
      )}
    </div>
  );
}
