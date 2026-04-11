import { and, eq, gte, lte, ne, count } from "drizzle-orm";
import { DateTime } from "luxon";
import type { Database } from "@/db";
import { availabilityRules, bookings, customers, providers, services } from "@/db/schema";
import type { ProviderSetupState } from "@/lib/provider-setup-model";

export type { DashboardNextStep, ProviderSetupState } from "@/lib/provider-setup-model";
export { buildProviderSetupSteps, getNextSetupStepHref } from "@/lib/provider-setup-model";

/**
 * Single load of flags and counts for onboarding, dashboard command center, and nav hints.
 */
export async function loadProviderSetupState(
  db: Database,
  providerId: string,
  timezone: string
): Promise<ProviderSetupState> {
  const [prov] = await db
    .select({
      username: providers.username,
      displayName: providers.displayName,
      publicProfileEnabled: providers.publicProfileEnabled,
      onboardingWalkthroughCompletedAt: providers.onboardingWalkthroughCompletedAt,
    })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);

  const hasIdentity = Boolean(prov?.username?.trim() && prov?.displayName?.trim());

  const [svcRow] = await db
    .select({ n: count() })
    .from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)));

  const activeServiceCount = Number(svcRow?.n ?? 0);
  const hasServices = activeServiceCount > 0;

  const [ruleRow] = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .where(eq(availabilityRules.providerId, providerId))
    .limit(1);
  const hasAvailability = !!ruleRow;

  const isPublished = !!prov?.publicProfileEnabled;
  const needsSetup = !hasServices || !hasAvailability || !isPublished || !hasIdentity;

  const [pendingRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "pending")));

  const pendingBookingCount = Number(pendingRow?.n ?? 0);

  const startOfToday = DateTime.now().setZone(timezone).startOf("day");
  const endOfToday = DateTime.now().setZone(timezone).endOf("day");

  const [todayRow] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, startOfToday.toJSDate()),
        lte(bookings.startsAt, endOfToday.toJSDate())
      )
    );

  const todayBookingCount = Number(todayRow?.n ?? 0);

  const [custRow] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(eq(customers.providerId, providerId), eq(customers.accountReady, true)));

  const customerCount = Number(custRow?.n ?? 0);

  const onboardingWalkthroughCompletedAt = prov?.onboardingWalkthroughCompletedAt ?? null;
  const onboardingTailPending =
    onboardingWalkthroughCompletedAt == null && hasIdentity && hasServices && hasAvailability;

  return {
    hasIdentity,
    hasServices,
    hasAvailability,
    isPublished,
    needsSetup,
    activeServiceCount,
    pendingBookingCount,
    todayBookingCount,
    customerCount,
    onboardingWalkthroughCompletedAt,
    onboardingTailPending,
  };
}
