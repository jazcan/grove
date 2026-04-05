import { and, asc, count, desc, eq, isNull, max, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  marketingCampaigns,
  marketingSavedContents,
  marketingSendLogs,
  messageTemplates,
  providers,
  services,
} from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { buildReconnectContextLine, scoreReconnectCustomer } from "@/lib/marketing/reconnect-priority";
import { requireProvider } from "@/lib/tenancy";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";

/** Max customers passed to the reconnect UI (prioritized); “View all” links to /dashboard/customers. */
const RECONNECT_LIST_CAP = 120;

export default async function MarketingPage() {
  const u = await requireProvider();
  const db = getDb();
  const csrf = await getCsrfTokenForForm();

  const [prov] = await db
    .select({ timezone: providers.timezone })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  const timezone = prov?.timezone ?? "America/Toronto";

  const baseCustomers = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
    })
    .from(customers)
    .where(and(eq(customers.providerId, u.providerId), eq(customers.accountReady, true)))
    .orderBy(asc(customers.fullName))
    .limit(400);

  const statsRows = await db
    .select({
      customerId: bookings.customerId,
      cnt: count(),
      lastAt: max(bookings.startsAt),
    })
    .from(bookings)
    .where(eq(bookings.providerId, u.providerId))
    .groupBy(bookings.customerId);

  const statsMap = new Map(statsRows.map((r) => [r.customerId, { cnt: Number(r.cnt), lastAt: r.lastAt }]));

  const sendLogRows = await db
    .select({ customerIds: marketingSendLogs.customerIds, sentAt: marketingSendLogs.sentAt })
    .from(marketingSendLogs)
    .where(eq(marketingSendLogs.providerId, u.providerId))
    .orderBy(desc(marketingSendLogs.sentAt))
    .limit(600);

  const lastMarketingByCustomer = new Map<string, Date>();
  for (const log of sendLogRows) {
    for (const cid of log.customerIds) {
      const prev = lastMarketingByCustomer.get(cid);
      if (!prev || log.sentAt > prev) lastMarketingByCustomer.set(cid, log.sentAt);
    }
  }

  type Row = {
    id: string;
    fullName: string;
    lastBookingAt: string | null;
    bookingCount: number;
    contextLine: string;
    priorityScore: number;
  };

  const nowMs = Date.now();
  const withStats: Row[] = baseCustomers.map((c) => {
    const s = statsMap.get(c.id);
    const bookingCount = s?.cnt ?? 0;
    const lastBookingAt = s?.lastAt ? s.lastAt.toISOString() : null;
    const lastM = lastMarketingByCustomer.get(c.id);
    const lastMarketingSentAt = lastM ? lastM.toISOString() : null;
    const statsInput = { lastBookingAt, bookingCount, lastMarketingSentAt };
    return {
      id: c.id,
      fullName: c.fullName,
      bookingCount,
      lastBookingAt,
      contextLine: buildReconnectContextLine(statsInput, timezone),
      priorityScore: scoreReconnectCustomer(statsInput, nowMs),
    };
  });

  withStats.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.fullName.localeCompare(b.fullName);
  });

  const reconnectCustomers = withStats.slice(0, RECONNECT_LIST_CAP).map((r) => ({
    id: r.id,
    fullName: r.fullName,
    lastBookingAt: r.lastBookingAt,
    bookingCount: r.bookingCount,
    contextLine: r.contextLine,
  }));

  const serviceRows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.providerId, u.providerId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));

  const campaignRows = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.providerId, u.providerId))
    .orderBy(desc(marketingCampaigns.createdAt))
    .limit(40);

  const savedRows = await db
    .select()
    .from(marketingSavedContents)
    .where(eq(marketingSavedContents.providerId, u.providerId))
    .orderBy(desc(marketingSavedContents.createdAt))
    .limit(15);

  const templates = await db
    .select({ id: messageTemplates.id, name: messageTemplates.name })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.messageType, "marketing"),
        eq(messageTemplates.isActive, true),
        or(eq(messageTemplates.providerId, u.providerId), isNull(messageTemplates.providerId))
      )
    )
    .orderBy(asc(messageTemplates.name));

  const quickSendCustomers = await db
    .select({ id: customers.id, fullName: customers.fullName })
    .from(customers)
    .where(
      and(
        eq(customers.providerId, u.providerId),
        eq(customers.accountReady, true),
        eq(customers.marketingOptOut, false)
      )
    )
    .orderBy(asc(customers.fullName))
    .limit(400);

  return (
    <main id="main-content" className="max-w-3xl">
      <MarketingWorkspace
        csrf={csrf}
        timezone={timezone}
        customers={reconnectCustomers}
        services={serviceRows}
        campaigns={campaignRows.map((c) => ({
          id: c.id,
          title: c.title,
          campaignType: c.campaignType,
          targetAudience: c.targetAudience,
          channel: c.channel,
          sendTiming: c.sendTiming,
          scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
          messageBody: c.messageBody,
          createdAt: c.createdAt.toISOString(),
        }))}
        savedContents={savedRows.map((s) => ({
          id: s.id,
          source: s.source,
          title: s.title,
          primaryText: s.primaryText,
          alternatives: s.alternatives ?? [],
          cta: s.cta,
          imagePrompt: s.imagePrompt,
          channel: s.channel,
          createdAt: s.createdAt.toISOString(),
        }))}
        templates={templates}
        quickSendCustomers={quickSendCustomers}
      />
    </main>
  );
}
