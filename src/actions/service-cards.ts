"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { bookings, canonicalServiceTemplates, customers, serviceCards, services } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

export async function saveServiceCard(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "saveServiceCard" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const bookingId = formData.get("bookingId")?.toString() ?? "";
  if (!bookingId) return { error: "Missing booking." };

  const servicePerformedRaw = formData.get("servicePerformedAt")?.toString() ?? "";
  const performedAt = new Date(servicePerformedRaw);
  if (Number.isNaN(performedAt.getTime())) {
    return { error: "Please enter a valid service date and time." };
  }

  const workSummary = plainTextFromInput(formData.get("workSummary")?.toString() ?? "", 8000);
  const observations = plainTextFromInput(formData.get("observations")?.toString() ?? "", 8000);
  const followUpRecommendation = plainTextFromInput(formData.get("followUpRecommendation")?.toString() ?? "", 4000);
  const internalNotes = plainTextFromInput(formData.get("cardInternalNotes")?.toString() ?? "", 8000);
  const customerVisibleSummary = plainTextFromInput(
    formData.get("customerVisibleSummary")?.toString() ?? "",
    8000
  );

  const db = getDb();
  const [row] = await db
    .select({
      booking: bookings,
      serviceName: services.name,
      templateLabel: canonicalServiceTemplates.label,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(canonicalServiceTemplates, eq(bookings.canonicalTemplateId, canonicalServiceTemplates.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.providerId, ctx.providerId)))
    .limit(1);

  if (!row) return { error: "Booking not found." };

  const [cust] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, row.booking.customerId), eq(customers.providerId, ctx.providerId)))
    .limit(1);
  if (!cust) return { error: "Customer not found." };

  const nameSnap = row.serviceName.slice(0, 200);
  const templateSnap = row.templateLabel?.trim() ? row.templateLabel.slice(0, 200) : null;

  const now = new Date();
  await db
    .insert(serviceCards)
    .values({
      providerId: ctx.providerId,
      bookingId: row.booking.id,
      customerId: row.booking.customerId,
      servicePerformedAt: performedAt,
      serviceNameSnapshot: nameSnap,
      templateLabelSnapshot: templateSnap,
      workSummary,
      observations,
      followUpRecommendation,
      internalNotes,
      customerVisibleSummary,
      createdByUserId: ctx.id,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [serviceCards.bookingId],
      set: {
        servicePerformedAt: performedAt,
        serviceNameSnapshot: nameSnap,
        templateLabelSnapshot: templateSnap,
        workSummary,
        observations,
        followUpRecommendation,
        internalNotes,
        customerVisibleSummary,
        updatedAt: now,
      },
    });

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "service_card",
    entityId: bookingId,
    action: "saved",
    metadata: { bookingId },
  });

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/customers/${row.booking.customerId}`);
  return { success: "Service card saved." };
}
