import { and, asc, count, desc, eq, isNull, max, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  marketingCampaigns,
  marketingSavedContents,
  messageTemplates,
  providers,
  services,
} from "@/db/schema";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { requireProvider } from "@/lib/tenancy";
import { MarketingWorkspace } from "@/components/marketing/marketing-workspace";

const RECONNECT_LIMIT = 60;

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

  type Row = {
    id: string;
    fullName: string;
    lastBookingAt: string | null;
    bookingCount: number;
  };

  const withStats: Row[] = baseCustomers.map((c) => {
    const s = statsMap.get(c.id);
    return {
      id: c.id,
      fullName: c.fullName,
      bookingCount: s?.cnt ?? 0,
      lastBookingAt: s?.lastAt ? s.lastAt.toISOString() : null,
    };
  });

  withStats.sort((a, b) => {
    const ta = a.lastBookingAt ? new Date(a.lastBookingAt).getTime() : 0;
    const tb = b.lastBookingAt ? new Date(b.lastBookingAt).getTime() : 0;
    if (!a.lastBookingAt && !b.lastBookingAt) return a.fullName.localeCompare(b.fullName);
    if (!a.lastBookingAt) return -1;
    if (!b.lastBookingAt) return 1;
    return ta - tb;
  });

  const reconnectCustomers = withStats.slice(0, RECONNECT_LIMIT);

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
      />
    </main>
  );
}
