"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { HandshakeLogo } from "@/components/brand/handshake-logo";
import { brand } from "@/config/brand";
import {
  dismissAssistantSuggestion,
  markAssistantSuggestionSeen,
  refreshAssistantPanel,
  sendAssistantMessage,
  snoozeAssistantSuggestion,
} from "@/actions/assistant";
import { getAssistantRouteId, getPageGuide, type AssistantRouteId } from "@/lib/onboarding-assistant-content";
import { buildProviderSetupSteps, type ProviderSetupState } from "@/lib/provider-setup-model";
import type { AssistantPanelSnapshot } from "@/lib/assistant/panel";

/** RSC passes assistant data as JSON text so Flight never serializes nested Dates/jsonb. */
function parseAssistantSnapshot(json: string | null): AssistantPanelSnapshot | null {
  if (json == null || json === "") return null;
  try {
    return JSON.parse(json) as AssistantPanelSnapshot;
  } catch {
    return null;
  }
}

function normalizePanelFromServer(next: AssistantPanelSnapshot): AssistantPanelSnapshot {
  return JSON.parse(JSON.stringify(next)) as AssistantPanelSnapshot;
}

const STORAGE_KEY = "grove.dashboardAssistant.ui.v1";

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
  if (stepKey === "services") return routeId === "services" || routeId === "first-service";
  if (stepKey === "availability") return routeId === "availability";
  if (stepKey === "customers") return routeId === "onboarding_customers" || routeId === "customers";
  if (stepKey === "share") return routeId === "onboarding_share";
  if (stepKey === "publish") return routeId === "profile";
  return false;
}

function onStepShortCta(stepKey: string): string {
  switch (stepKey) {
    case "services":
      return "Add a bookable service";
    case "availability":
      return "Set working hours";
    case "customers":
      return "Add people you know";
    case "share":
      return "Copy your link";
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
    case "onboarding_customers":
      return { label: "Continue to share ideas", href: "/dashboard/onboarding/share" };
    case "onboarding_share":
      return { label: "Open dashboard", href: "/dashboard" };
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
      return { label: "Open dashboard", href: "/dashboard" };
    case "first-service":
      return { label: "Open dashboard", href: "/dashboard" };
    default:
      return { label: "Command center", href: "/dashboard" };
  }
}

export type DashboardAssistantProps = {
  setup: ProviderSetupState | null;
  setupLoadFailed?: boolean;
  preProvider: boolean;
  initialExpanded: boolean;
  /** JSON.stringify(AssistantPanelSnapshot) from the server layout. */
  assistantJson: string | null;
  csrf: string;
  supportLinks?: { label: string; href: string }[];
};

export function DashboardAssistant({
  setup,
  setupLoadFailed = false,
  preProvider,
  initialExpanded,
  assistantJson,
  csrf,
  supportLinks,
}: DashboardAssistantProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeId = useMemo(() => getAssistantRouteId(pathname), [pathname]);
  const guide = useMemo(() => getPageGuide(routeId), [routeId]);

  const [expanded, setExpanded] = useState(initialExpanded);
  const [panel, setPanel] = useState<AssistantPanelSnapshot | null>(() =>
    parseAssistantSnapshot(assistantJson)
  );
  const [askInput, setAskInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [toastShown, setToastShown] = useState<string | null>(null);
  const prevRouteIdRef = useRef<AssistantRouteId | null>(null);

  useEffect(() => {
    if (routeId === "onboarding" || routeId === "first-service") {
      const prev = prevRouteIdRef.current;
      if (prev !== "onboarding" && prev !== "first-service") {
        setExpanded(false);
      }
      prevRouteIdRef.current = routeId;
      return;
    }
    prevRouteIdRef.current = routeId;
    const stored = readStored();
    if (stored === "minimized") setExpanded(false);
    else if (stored === "open") setExpanded(true);
    else setExpanded(initialExpanded);
  }, [routeId, initialExpanded]);

  useEffect(() => {
    setPanel(parseAssistantSnapshot(assistantJson));
  }, [assistantJson]);

  const minimize = useCallback(() => {
    setExpanded(false);
    writeStored("minimized");
  }, []);

  const openPanel = useCallback(() => {
    setExpanded(true);
    writeStored("open");
    startTransition(async () => {
      const next = await refreshAssistantPanel();
      if ("error" in next) return;
      setPanel(normalizePanelFromServer(next));
    });
  }, []);

  const fab = panel?.fab ?? { badgeCount: 0, pulse: false, toastSuggestionId: null };

  useEffect(() => {
    if (!fab.toastSuggestionId || toastShown === fab.toastSuggestionId) return;
    setToastShown(fab.toastSuggestionId);
    const unpaid = panel?.suggestions.find((s) => s.id === fab.toastSuggestionId);
    if (unpaid && typeof window !== "undefined") {
      // One quiet toast — operational, not chatty.
      console.info(
        `[${brand.appName} assistant]`,
        unpaid.title,
        "—",
        unpaid.summary.slice(0, 120)
      );
    }
  }, [fab.toastSuggestionId, panel?.suggestions, toastShown]);

  const steps = setup ? buildProviderSetupSteps(setup) : [];
  const requiredSetupSteps = steps.filter((s) => !s.optional);
  const nextIncomplete = requiredSetupSteps.find((s) => !s.done) ?? null;
  const completedSetupSteps = setup ? requiredSetupSteps.filter((s) => s.done).length : 0;
  const totalSetupSteps = requiredSetupSteps.length;
  const progressPct =
    totalSetupSteps > 0 ? Math.round((completedSetupSteps / totalSetupSteps) * 100) : 0;

  const primaryCta = useMemo(() => {
    if (setupLoadFailed) {
      return { label: "Reload page", href: pathname || "/dashboard" };
    }
    if (preProvider || !setup) {
      if (routeId === "onboarding" || routeId === "first-service") {
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

  const handleDismiss = (suggestionId: string) => {
    const fd = new FormData();
    fd.set("csrf", csrf);
    fd.set("suggestionId", suggestionId);
    startTransition(async () => {
      await dismissAssistantSuggestion(fd);
      router.refresh();
      const next = await refreshAssistantPanel();
      if (!("error" in next)) setPanel(normalizePanelFromServer(next));
    });
  };

  const handleSnooze = (suggestionId: string) => {
    const fd = new FormData();
    fd.set("csrf", csrf);
    fd.set("suggestionId", suggestionId);
    fd.set("hours", "24");
    startTransition(async () => {
      await snoozeAssistantSuggestion(fd);
      router.refresh();
      const next = await refreshAssistantPanel();
      if (!("error" in next)) setPanel(normalizePanelFromServer(next));
    });
  };

  const handleSeen = (suggestionId: string) => {
    const fd = new FormData();
    fd.set("csrf", csrf);
    fd.set("suggestionId", suggestionId);
    startTransition(async () => {
      await markAssistantSuggestionSeen(fd);
      router.refresh();
      const next = await refreshAssistantPanel();
      if (!("error" in next)) setPanel(normalizePanelFromServer(next));
    });
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    const fd = new FormData();
    fd.set("csrf", csrf);
    fd.set("message", askInput);
    startTransition(async () => {
      const res = await sendAssistantMessage(fd);
      setAskInput("");
      if (res.ok) {
        router.refresh();
        const next = await refreshAssistantPanel();
        if (!("error" in next)) setPanel(normalizePanelFromServer(next));
      }
    });
  };

  const ctx = panel?.context;
  const suggestions = panel?.suggestions ?? [];
  const assistantMessages = panel?.messages ?? [];
  const persistenceReady = panel?.persistenceReady !== false;
  const contextLoadFailed = panel?.contextLoadFailed === true;

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6"
      data-grove-assistant
    >
      {expanded ? (
        <aside
          className="pointer-events-auto flex max-h-[min(85vh,640px)] w-[min(100vw-2rem,28rem)] flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_96%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_92%,transparent)]"
          aria-label={`${brand.appName} assistant`}
          role="complementary"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color-mix(in_oklab,var(--card-border)_18%,transparent)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <HandshakeLogo size={36} className="h-9 w-9 shrink-0 shadow-[var(--shadow-sm)]" aria-hidden />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Assistant</div>
                <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {brand.appName} · Provider
                </div>
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!preProvider && panel === null ? (
              <p className="mb-4 text-sm text-[var(--muted)]">
                Assistant data could not be loaded. Reload the page.
              </p>
            ) : null}
            {!preProvider && ctx ? (
              <>
                {contextLoadFailed ? (
                  <div className="mb-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                    Could not load live bookings and setup from the database. Confirm{" "}
                    <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[10px]">DATABASE_URL</code> and that
                    Postgres is reachable, then reload.
                  </div>
                ) : null}
                {!persistenceReady && !contextLoadFailed ? (
                  <div className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                    Suggestions and saved chat need the assistant tables. Apply{" "}
                    <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[10px]">
                      drizzle/0015_assistant_foundation.sql
                    </code>{" "}
                    (e.g.{" "}
                    <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[10px]">
                      npx tsx scripts/apply-sql-migration.ts drizzle/0015_assistant_foundation.sql
                    </code>
                    ). Today and Ask still use your live bookings and setup data.
                  </div>
                ) : null}
                <section className="mb-6" aria-labelledby="assist-today">
                  <h2 id="assist-today" className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Today&apos;s schedule
                  </h2>
                  <div className="mt-2 space-y-2 text-sm">
                    {ctx.todayBookings.length === 0 ? (
                      <p className="text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                        Nothing scheduled for today.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {ctx.todayBookings.slice(0, 8).map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/dashboard/bookings/${b.id}`}
                              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                            >
                              {new Date(b.startsAt).toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              · {b.customerName}
                            </Link>
                            <span className="text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
                              {" "}
                              — {b.serviceName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-[var(--muted)]">
                      Pending requests: {ctx.setup.pendingBookingCount} · Customers: {ctx.setup.customerCount}
                    </p>
                  </div>
                </section>

                <section className="mb-6" aria-labelledby="assist-suggestions">
                  <h2
                    id="assist-suggestions"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                  >
                    Suggestions
                  </h2>
                  {suggestions.length === 0 ? (
                    <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
                      {persistenceReady
                        ? "You are caught up. We will surface the next actionable item when we see one."
                        : "No saved suggestions until the assistant migration is applied."}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {suggestions.map((s) => {
                        const actions = (s.actionPayloadJson.actions as string[] | undefined) ?? [];
                        const href = (s.actionPayloadJson.href as string | undefined) ??
                          (s.actionPayloadJson.primaryHref as string | undefined);
                        return (
                          <li
                            key={s.id}
                            className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3"
                          >
                            <div className="text-sm font-semibold text-[var(--foreground)]">{s.title}</div>
                            <p className="mt-1 text-xs leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                              {s.summary}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {href ? (
                                <Link
                                  href={href}
                                  className="ui-btn-primary inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold no-underline"
                                >
                                  {s.type === "payment_outstanding"
                                    ? "Review booking"
                                    : s.type === "customer_lapsed"
                                      ? "View customer"
                                      : s.type === "onboarding_incomplete"
                                        ? "Continue setup"
                                        : "Open"}
                                </Link>
                              ) : null}
                              {s.status === "new" ? (
                                <button
                                  type="button"
                                  className="ui-btn-secondary min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold"
                                  disabled={pending}
                                  onClick={() => handleSeen(s.id)}
                                >
                                  Mark seen
                                </button>
                              ) : null}
                              {actions.includes("snooze") ? (
                                <button
                                  type="button"
                                  className="ui-btn-secondary min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold"
                                  disabled={pending}
                                  onClick={() => handleSnooze(s.id)}
                                >
                                  Snooze 24h
                                </button>
                              ) : null}
                              {actions.includes("dismiss") ? (
                                <button
                                  type="button"
                                  className="ui-btn-secondary min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold"
                                  disabled={pending}
                                  onClick={() => handleDismiss(s.id)}
                                >
                                  Dismiss
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="mb-6" aria-labelledby="assist-ask">
                  <h2 id="assist-ask" className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Ask
                  </h2>
                  <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
                    Grounded answers from your dashboard data (rules-first). Not legal or tax advice.
                    {!persistenceReady ? " Saving chat history requires the assistant migration." : null}
                  </p>
                  {assistantMessages.length > 0 ? (
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 text-xs">
                      {assistantMessages.map((m) => (
                        <div
                          key={m.id}
                          className={
                            m.role === "user"
                              ? "text-[var(--foreground)]"
                              : "text-[color-mix(in_oklab,var(--foreground)_82%,transparent)]"
                          }
                        >
                          <span className="font-semibold">{m.role === "user" ? "You" : "Assistant"}:</span>{" "}
                          <span className="whitespace-pre-wrap">{m.body}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <form
                    onSubmit={handleAsk}
                    className={`flex gap-2 ${assistantMessages.length > 0 ? "mt-2" : "mt-3"}`}
                  >
                    <input
                      name="message"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      placeholder="e.g. What’s on today?"
                      className="min-h-10 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm"
                      disabled={pending}
                    />
                    <button
                      type="submit"
                      className="ui-btn-secondary min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold"
                      disabled={pending || !csrf}
                    >
                      Send
                    </button>
                  </form>
                </section>

                <section className="mb-4" aria-labelledby="assist-activity">
                  <h2
                    id="assist-activity"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                  >
                    Recent activity
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-xs text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
                    {ctx.recentEvents.slice(0, 8).map((ev) => (
                      <li key={ev.id}>
                        <span className="font-medium text-[var(--foreground)]">{ev.eventType}</span> ·{" "}
                        {new Date(ev.createdAt).toLocaleString()}
                      </li>
                    ))}
                    {ctx.recentEvents.length === 0 ? <li>No assistant events logged yet.</li> : null}
                  </ul>
                </section>
              </>
            ) : (
              <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                Finish provider onboarding to unlock assistant insights tied to your business data.
              </p>
            )}

            <details className="mt-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Page guide &amp; setup
              </summary>
              <div className="mt-3">
                <p className="text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
                  {guide.body}
                </p>

                {setupLoadFailed ? (
                  <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                    Couldn&apos;t load setup status. Check your database connection or environment, then reload.
                  </div>
                ) : showProgress ? (
                  <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]">
                      <span>Setup progress</span>
                      <span className="tabular-nums">{progressPct}%</span>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-inset ring-[var(--card-border)]"
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
                      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                        Still to do: {nextIncomplete.label}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-[var(--success)]">
                        You&apos;re ready to take bookings.
                      </p>
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
                  <ul className="mt-4 space-y-1.5 pt-1">
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
            </details>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={openPanel}
          className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-soft-border)] bg-[var(--card)] shadow-[var(--shadow-md)] transition-[transform,box-shadow] hover:bg-[var(--surface-hover)] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${fab.pulse ? "animate-pulse" : ""}`}
          aria-label={`Open ${brand.appName} assistant`}
          aria-expanded={false}
        >
          <HandshakeLogo size={40} className="h-10 w-10 shrink-0" aria-hidden />
          {fab.badgeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--accent-foreground)]">
              {fab.badgeCount > 9 ? "9+" : fab.badgeCount}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
