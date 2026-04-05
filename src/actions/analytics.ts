"use server";

import { and, count, desc, eq, gt, gte, inArray, lte } from "drizzle-orm";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { bookings, customers, providers, services } from "@/db/schema";
import { requireProvider } from "@/lib/tenancy";

export type AnalyticsModalMetric = "total" | "completed" | "no_show" | "paid" | "revenue" | "repeat";

export type AnalyticsBookingDetailRow = {
  id: string;
  startsAt: string;
  status: string;
  paymentStatus: string;
  paymentAmount: string | null;
  currency: string;
  serviceName: string;
  customerId: string;
  customerName: string;
};

export type AnalyticsRepeatDetailRow = {
  customerId: string;
  customerName: string;
  bookingCount: number;
};

async function providerTimezone(providerId: string): Promise<string> {
  const db = getDb();
  const [p] = await db.select({ timezone: providers.timezone }).from(providers).where(eq(providers.id, providerId)).limit(1);
  return p?.timezone ?? "America/Toronto";
}

export async function fetchAnalyticsModalData(
  metric: AnalyticsModalMetric,
  fromDay: string,
  toDay: string
): Promise<
  | { ok: true; kind: "bookings"; rows: AnalyticsBookingDetailRow[] }
  | { ok: true; kind: "repeat"; rows: AnalyticsRepeatDetailRow[] }
  | { ok: false; error: string }
> {
  const u = await requireProvider();
  const tz = await providerTimezone(u.providerId);

  const start = DateTime.fromISO(fromDay, { zone: tz }).startOf("day");
  const end = DateTime.fromISO(toDay, { zone: tz }).endOf("day");
  if (!start.isValid || !end.isValid || end < start) {
    return { ok: false, error: "Invalid date range." };
  }

  const fromJs = start.toUTC().toJSDate();
  const toJs = end.toUTC().toJSDate();
  const db = getDb();
  const rangeWhere = and(
    eq(bookings.providerId, u.providerId),
    gte(bookings.startsAt, fromJs),
    lte(bookings.startsAt, toJs)
  );

  if (metric === "repeat") {
    const grouped = await db
      .select({
        customerId: bookings.customerId,
        n: count(),
      })
      .from(bookings)
      .where(rangeWhere)
      .groupBy(bookings.customerId)
      .having(gt(count(), 1));

    if (grouped.length === 0) {
      return { ok: true, kind: "repeat", rows: [] };
    }

    const ids = grouped.map((g) => g.customerId);
    const nameRows = await db
      .select({ id: customers.id, fullName: customers.fullName })
      .from(customers)
      .where(and(eq(customers.providerId, u.providerId), inArray(customers.id, ids)));
    const nameById = new Map(nameRows.map((r) => [r.id, r.fullName]));

    const rows: AnalyticsRepeatDetailRow[] = grouped
      .map((g) => ({
        customerId: g.customerId,
        customerName: nameById.get(g.customerId) ?? "Customer",
        bookingCount: Number(g.n),
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount || a.customerName.localeCompare(b.customerName));

    return { ok: true, kind: "repeat", rows };
  }

  const extra =
    metric === "completed"
      ? eq(bookings.status, "completed")
      : metric === "no_show"
        ? eq(bookings.status, "no_show")
        : metric === "paid" || metric === "revenue"
          ? eq(bookings.paymentStatus, "paid")
          : undefined;

  const rows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      paymentAmount: bookings.paymentAmount,
      currency: services.currency,
      serviceName: services.name,
      customerId: customers.id,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(extra ? and(rangeWhere, extra) : rangeWhere)
    .orderBy(desc(bookings.startsAt))
    .limit(500);

  const out: AnalyticsBookingDetailRow[] = rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt.toISOString(),
    status: r.status,
    paymentStatus: r.paymentStatus,
    paymentAmount: r.paymentAmount?.toString() ?? null,
    currency: r.currency,
    serviceName: r.serviceName,
    customerId: r.customerId,
    customerName: r.customerName,
  }));

  return { ok: true, kind: "bookings", rows: out };
}
