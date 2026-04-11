import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import {
  availabilityRules,
  bookings,
  customers,
  marketingSendLogs,
  messageTemplates,
  providers,
  services,
} from "@/db/schema";
import { ActionCenter, type SmartAction } from "@/components/dashboard/action-center";
import { AttentionNeededSection } from "@/components/dashboard/attention-needed";
import {
  DashboardRecentActivity,
  type DashboardActivityItem,
} from "@/components/dashboard/dashboard-recent-activity";
import { NextAppointmentsPanel, type NextAppointmentRow } from "@/components/dashboard/next-appointments-panel";
import { PublicProfileLiveCard } from "@/components/dashboard/public-profile-live-card";
import {
  TodayOverview,
  type OutreachReminder,
  type TodayBookingPreview,
} from "@/components/dashboard/today-overview";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { fetchPresentedProviderSignals } from "@/domain/provider-dashboard-signals";
import { computeWeeklyAvailableMinutes } from "@/lib/dashboard-metrics";
import { getPublicSiteOriginForUserFacingLinks } from "@/lib/server/public-site-origin";
import { loadProviderSetupState } from "@/lib/provider-setup";
import { requireProvider } from "@/lib/tenancy";

function buildOutreachReminder(
  customerCount: number,
  lastMarketingSentAt: Date | null,
  pendingBookingCount: number
): OutreachReminder | null {
  if (pendingBookingCount > 0) return null;
  if (customerCount < 1) return null;
  if (!lastMarketingSentAt) return { kind: "never" };
  const days = Math.floor((Date.now() - lastMarketingSentAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days >= 10) return { kind: "stale", daysSince: days };
  return null;
}

export default async function DashboardHomePage() {
  const u = await requireProvider();
  const db = getDb();
  const csrf = await getCsrfTokenForForm();
  const [prov] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);

  const timezone = prov?.timezone ?? "America/Toronto";
  const setup = await loadProviderSetupState(db, u.providerId, timezone);

  const [anyBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .limit(1);
  const hasAnyBooking = !!anyBooking;

  const [svcCur] = await db
    .select({ currency: services.currency })
    .from(services)
    .where(eq(services.providerId, u.providerId))
    .limit(1);
  const currencyLabel = (svcCur?.currency ?? "CAD").toUpperCase();

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const endOfToday = DateTime.now().setZone(timezone).endOf("day");
  const now = new Date();
  const z = DateTime.now().setZone(timezone);
  const weekStart = z.startOf("week").toJSDate();
  const weekEnd = z.endOf("week").toJSDate();

  const todayRows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    )
    .orderBy(asc(bookings.startsAt));

  const todayBookings: TodayBookingPreview[] = todayRows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt.toISOString(),
    status: r.status,
    customerName: r.customerName,
  }));

  const [revTodayRow] = await db
    .select({
      total: sql<string>`coalesce(sum((${bookings.paymentAmount})::numeric), 0)::text`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, u.providerId),
        eq(bookings.paymentStatus, "paid"),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    );
  const revenueToday = Number(revTodayRow?.total ?? 0);

  const upcomingRows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      customerName: customers.fullName,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.providerId, u.providerId), ne(bookings.status, "cancelled"), gte(bookings.startsAt, now)))
    .orderBy(asc(bookings.startsAt))
    .limit(40);

  const nextUpRows = upcomingRows;
  const nextAppointments: NextAppointmentRow[] = nextUpRows.slice(0, 3).map((b) => ({
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    status: b.status,
    customerName: b.customerName,
  }));

  const nextForOverview =
    nextUpRows[0] != null
      ? {
          startsAt: nextUpRows[0].startsAt.toISOString(),
          customerName: nextUpRows[0].customerName,
          serviceName: nextUpRows[0].serviceName,
        }
      : null;

  const availRuleRows = await db
    .select({
      dayOfWeek: availabilityRules.dayOfWeek,
      startTimeLocal: availabilityRules.startTimeLocal,
      endTimeLocal: availabilityRules.endTimeLocal,
      isActive: availabilityRules.isActive,
    })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, u.providerId));

  const weekBookingsForUtil = await db
    .select({
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(eq(bookings.providerId, u.providerId), gte(bookings.startsAt, weekStart), lte(bookings.startsAt, weekEnd))
    );

  const availableWeeklyMinutes = computeWeeklyAvailableMinutes(timezone, availRuleRows, now);
  let bookedWeeklyMinutes = 0;
  for (const b of weekBookingsForUtil) {
    if (b.status === "cancelled") continue;
    bookedWeeklyMinutes += (b.endsAt.getTime() - b.startsAt.getTime()) / 60000;
  }
  const utilizationPercent =
    availableWeeklyMinutes > 0
      ? Math.min(100, Math.round((bookedWeeklyMinutes / availableWeeklyMinutes) * 100))
      : null;

  const published = setup.isPublished;
  const needsSetup = setup.needsSetup;

  const appUrl = await getPublicSiteOriginForUserFacingLinks();
  const profileUrl = prov?.username ? `${appUrl}/${prov.username}` : appUrl;

  const presentedSignals = await fetchPresentedProviderSignals(db, u.providerId);
  const hasSignals = presentedSignals.length > 0;

  const [lastMarketingSendRow] = await db
    .select({ sentAt: marketingSendLogs.sentAt })
    .from(marketingSendLogs)
    .where(eq(marketingSendLogs.providerId, u.providerId))
    .orderBy(desc(marketingSendLogs.sentAt))
    .limit(1);
  const lastMarketingSentAt = lastMarketingSendRow?.sentAt ?? null;

  const weeklyOpenMinutes = Math.max(0, availableWeeklyMinutes - bookedWeeklyMinutes);
  const outreachReminder = buildOutreachReminder(
    setup.customerCount,
    lastMarketingSentAt,
    setup.pendingBookingCount
  );

  const recentBookingRows = await db
    .select({
      id: bookings.id,
      createdAt: bookings.createdAt,
      status: bookings.status,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(eq(bookings.providerId, u.providerId))
    .orderBy(desc(bookings.createdAt))
    .limit(8);

  const recentSendRows = await db
    .select({
      id: marketingSendLogs.id,
      sentAt: marketingSendLogs.sentAt,
      templateName: messageTemplates.name,
    })
    .from(marketingSendLogs)
    .leftJoin(messageTemplates, eq(marketingSendLogs.templateId, messageTemplates.id))
    .where(eq(marketingSendLogs.providerId, u.providerId))
    .orderBy(desc(marketingSendLogs.sentAt))
    .limit(8);

  const merged: DashboardActivityItem[] = [
    ...recentBookingRows.map((b) => ({
      kind: "booking" as const,
      id: b.id,
      at: b.createdAt.toISOString(),
      label: `Booking · ${b.customerName} (${b.status})`,
      href: `/dashboard/bookings/${b.id}`,
    })),
    ...recentSendRows.map((s) => ({
      kind: "campaign" as const,
      id: s.id,
      at: s.sentAt.toISOString(),
      label: `Campaign sent · ${s.templateName ?? "Email"}`,
      href: "/dashboard/marketing",
    })),
    ...presentedSignals.map((sig) => ({
      kind: "signal" as const,
      id: sig.id,
      at: sig.lastSeenAt,
      label: `Signal · ${sig.title} (${sig.occurrenceCount}×)`,
      href: sig.secondaryCta?.href ?? "/dashboard/profile",
    })),
  ];
  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const activityItems = merged.slice(0, 10);

  const actions: SmartAction[] = [];

  if (!setup.hasServices) {
    actions.push({
      id: "onboarding-first-service",
      title: "Add your first bookable offer",
      body: "One service—name, duration, and price—is enough to unlock the rest of setup.",
      href: "/dashboard/onboarding/first-service",
      cta: "Add a service",
    });
  }

  if (setup.onboardingTailPending && setup.customerCount === 0) {
    actions.push({
      id: "onboarding-customers",
      title: "Optional: add people you already know",
      body: "Import or add a few customers so follow-ups stay organized—skip anytime.",
      href: "/dashboard/onboarding/customers",
      cta: "Add customers",
    });
  } else if (setup.onboardingTailPending && setup.customerCount > 0) {
    actions.push({
      id: "onboarding-share",
      title: "Share your booking link",
      body: "Copy a short message when you’re ready—nothing is sent from us automatically.",
      href: "/dashboard/onboarding/share",
      cta: "Get share ideas",
    });
  }

  if (hasSignals) {
    actions.push({
      id: "fix-signals",
      title: "Resolve issues on your public booking page",
      body: "People are running into booking issues—review and make sure everything is clear and available.",
      href: "/dashboard#attention",
      cta: "Review signals",
    });
  }

  if (!setup.hasServices) {
    actions.push({
      id: "no-services",
      title: "Add what people can book",
      body: "Create one service with a name, duration, and price—then set your availability.",
      href: setup.hasIdentity ? "/dashboard/onboarding/first-service" : "/dashboard/onboarding",
      cta: setup.hasIdentity ? "Add a service" : "Finish profile setup",
    });
  }

  if (!setup.hasAvailability) {
    actions.push({
      id: "no-availability",
      title: "Your availability is empty",
      body: "Add weekly hours so clients can see open times and book you.",
      href: "/dashboard/availability",
      cta: "Add hours",
    });
  }

  if (!setup.isPublished && setup.hasServices && setup.hasAvailability) {
    actions.push({
      id: "publish",
      title: "Profile isn’t live",
      body: "Publish your public profile so your booking link works for clients.",
      href: "/dashboard/profile",
      cta: "Publish profile",
    });
  }

  if (
    utilizationPercent !== null &&
    utilizationPercent < 20 &&
    availableWeeklyMinutes > 0 &&
    hasAnyBooking
  ) {
    actions.push({
      id: "low-utilization",
      title: "Your calendar is mostly open",
      body: "Tweak your weekly hours or promote your link to fill more slots.",
      href: "/dashboard/availability",
      cta: "Adjust availability",
    });
  }

  if (!hasAnyBooking) {
    actions.push({
      id: "no-bookings-campaign",
      title: "You have no bookings yet",
      body: "Create a campaign to reach new clients and fill your calendar.",
      href: "/dashboard/marketing",
      cta: "Create campaign",
    });
  }

  if (setup.customerCount === 1 && !actions.some((a) => a.id === "no-bookings-campaign")) {
    actions.push({
      id: "one-customer",
      title: "You have one customer",
      body: "Invite them back with a follow-up, offer, or campaign from Marketing.",
      href: "/dashboard/marketing",
      cta: "Invite them back",
    });
  }

  const fillerActions: SmartAction[] = [
    {
      id: "filler-marketing",
      title: "Stay on clients’ minds",
      body: "Reach out and stay top of mind in your community.",
      href: "/dashboard/marketing",
      cta: "Open marketing",
    },
    {
      id: "filler-services",
      title: "Tune what you sell",
      body: "Fine-tune what you offer so more people say yes.",
      href: "/dashboard/services",
      cta: "Manage services",
    },
    {
      id: "filler-availability",
      title: "Protect your time",
      body: "Block personal time or extend hours where you want more volume.",
      href: "/dashboard/availability",
      cta: "Edit availability",
    },
    {
      id: "filler-customers",
      title: "Grow your list",
      body: "Add clients you already know so follow-ups stay organized.",
      href: "/dashboard/customers",
      cta: "View customers",
    },
  ];

  const seenIds = new Set(actions.map((a) => a.id));
  const hasMarketingHref = actions.some((a) => a.href === "/dashboard/marketing");
  const hasAvailabilityHref = actions.some((a) => a.href === "/dashboard/availability");
  for (const f of fillerActions) {
    if (actions.length >= 5) break;
    if (f.id === "filler-marketing" && hasMarketingHref) continue;
    if (f.id === "filler-availability" && hasAvailabilityHref) continue;
    if (!seenIds.has(f.id)) {
      actions.push(f);
      seenIds.add(f.id);
    }
  }

  return (
    <main id="main-content">
      <div className="mx-auto max-w-[800px]">
        <header className="pt-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your day at a glance</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {needsSetup
              ? "Finish the basics below, then lean on this page to spot issues, see your day, and pick one sensible next step."
              : setup.onboardingTailPending
                ? "Core setup is in place—use the highlighted step if you want a nudge on customers or sharing, or jump in anywhere from the nav."
                : published
                  ? "Your home base—see what needs a human touch, what’s on for today, and what to do next."
                  : "Almost there—publish when it feels right, then share your link so neighbors can book."}
          </p>
        </header>

        <section className="mt-8 space-y-8 pb-12 sm:mt-10 sm:space-y-10">
          <AttentionNeededSection signals={presentedSignals} csrfToken={csrf} />

          <TodayOverview
            timezone={timezone}
            todayBookings={todayBookings}
            revenueToday={revenueToday}
            currencyLabel={currencyLabel}
            nextBooking={nextForOverview}
            hasAnyBooking={hasAnyBooking}
            published={published}
            profileUrl={profileUrl}
            username={prov?.username}
            pendingBookingCount={setup.pendingBookingCount}
            customerCount={setup.customerCount}
            lastMarketingSentAt={lastMarketingSentAt ? lastMarketingSentAt.toISOString() : null}
            weeklyOpenMinutes={weeklyOpenMinutes}
            outreachReminder={outreachReminder}
          />

          <ActionCenter actions={actions.slice(0, 5)} />

          {!needsSetup && published && prov?.username ? (
            <PublicProfileLiveCard username={prov.username} profileUrl={profileUrl} />
          ) : null}

          <NextAppointmentsPanel
            timezone={timezone}
            appointments={nextAppointments}
            published={published}
            profileUrl={profileUrl}
            username={prov?.username}
          />

          <DashboardRecentActivity
            items={activityItems}
            timezone={timezone}
            hasAnyBooking={hasAnyBooking}
            published={published}
            username={prov?.username}
          />
        </section>
      </div>
    </main>
  );
}
