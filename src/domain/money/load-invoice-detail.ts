import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { bookings, customers, invoiceRecords, providers, services } from "@/db/schema";

export type InvoiceDetailPayload = {
  invoice: typeof invoiceRecords.$inferSelect;
  providerName: string;
  customerName: string;
  serviceName: string;
  bookingStartsAt: Date;
};

export async function loadInvoiceDetailForProvider(
  db: Database,
  invoiceId: string,
  providerId: string
): Promise<InvoiceDetailPayload | null> {
  const [row] = await db
    .select({
      invoice: invoiceRecords,
      providerName: providers.displayName,
      businessName: providers.businessName,
      customerName: customers.fullName,
      serviceName: services.name,
      startsAt: bookings.startsAt,
    })
    .from(invoiceRecords)
    .innerJoin(providers, eq(invoiceRecords.providerId, providers.id))
    .innerJoin(bookings, eq(invoiceRecords.bookingId, bookings.id))
    .innerJoin(customers, eq(invoiceRecords.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(invoiceRecords.id, invoiceId), eq(invoiceRecords.providerId, providerId)))
    .limit(1);

  if (!row) return null;

  const providerName = row.businessName?.trim() || row.providerName;

  return {
    invoice: row.invoice,
    providerName,
    customerName: row.customerName,
    serviceName: row.serviceName,
    bookingStartsAt: row.startsAt,
  };
}
