"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  bookings,
  customerRecommendations,
  customers,
  serviceCards,
} from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import {
  CUSTOMER_RECOMMENDATION_STATUSES,
  CUSTOMER_RECOMMENDATION_TIMEFRAMES,
  type CustomerRecommendationStatus,
  type CustomerRecommendationTimeframe,
} from "@/platform/enums";

function isTimeframe(s: string): s is CustomerRecommendationTimeframe {
  return (CUSTOMER_RECOMMENDATION_TIMEFRAMES as readonly string[]).includes(s);
}

function isStatus(s: string): s is CustomerRecommendationStatus {
  return (CUSTOMER_RECOMMENDATION_STATUSES as readonly string[]).includes(s);
}

export async function createCustomerRecommendation(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "createCustomerRecommendation" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const customerId = formData.get("customerId")?.toString().trim() ?? "";
  const title = plainTextFromInput(formData.get("title")?.toString() ?? "", 200);
  const description = plainTextFromInput(formData.get("description")?.toString() ?? "", 4000);
  const reason = plainTextFromInput(formData.get("reason")?.toString() ?? "", 4000);
  const timeframeRaw = formData.get("suggestedTimeframe")?.toString().trim() ?? "next_visit";
  const timeframeDetail = plainTextFromInput(formData.get("timeframeDetail")?.toString() ?? "", 500);
  const sourceBookingIdRaw = formData.get("sourceBookingId")?.toString().trim() ?? "";
  const sourceServiceCardIdRaw = formData.get("sourceServiceCardId")?.toString().trim() ?? "";

  if (!customerId) return { error: "Customer is required." };
  if (!title) return { error: "Title is required." };
  if (!isTimeframe(timeframeRaw)) return { error: "Invalid timeframe." };

  const db = getDb();

  const [cust] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.providerId, ctx.providerId)))
    .limit(1);
  if (!cust) return { error: "Customer not found." };

  let sourceBookingId: string | null = null;
  if (sourceBookingIdRaw) {
    const [b] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.id, sourceBookingIdRaw),
          eq(bookings.providerId, ctx.providerId),
          eq(bookings.customerId, customerId)
        )
      )
      .limit(1);
    if (!b) return { error: "Source booking not found for this customer." };
    sourceBookingId = b.id;
  }

  let sourceServiceCardId: string | null = null;
  if (sourceServiceCardIdRaw) {
    const [c] = await db
      .select({ id: serviceCards.id, bookingId: serviceCards.bookingId })
      .from(serviceCards)
      .where(
        and(
          eq(serviceCards.id, sourceServiceCardIdRaw),
          eq(serviceCards.providerId, ctx.providerId),
          eq(serviceCards.customerId, customerId)
        )
      )
      .limit(1);
    if (!c) return { error: "Service record not found for this customer." };
    if (sourceBookingId && c.bookingId !== sourceBookingId) {
      return { error: "Service record does not match the selected booking." };
    }
    sourceServiceCardId = c.id;
  }

  const [row] = await db
    .insert(customerRecommendations)
    .values({
      providerId: ctx.providerId,
      customerId,
      sourceBookingId,
      sourceServiceCardId,
      title,
      description,
      reason,
      suggestedTimeframe: timeframeRaw,
      timeframeDetail,
      status: "open",
      createdByUserId: ctx.id,
    })
    .returning({ id: customerRecommendations.id });

  if (!row) return { error: "Could not save recommendation." };

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer_recommendation",
    entityId: row.id,
    action: "created",
    metadata: { customerId },
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  return { success: "Recommendation saved." };
}

export async function updateCustomerRecommendationStatus(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "updateCustomerRecommendationStatus" }))) {
    return { error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString().trim() ?? "";
  const statusRaw = formData.get("status")?.toString().trim() ?? "";
  if (!id) return { error: "Recommendation not found." };
  if (!isStatus(statusRaw)) return { error: "Invalid status." };

  const db = getDb();
  const [rec] = await db
    .select({ id: customerRecommendations.id, customerId: customerRecommendations.customerId })
    .from(customerRecommendations)
    .where(and(eq(customerRecommendations.id, id), eq(customerRecommendations.providerId, ctx.providerId)))
    .limit(1);
  if (!rec) return { error: "Not found." };

  await db
    .update(customerRecommendations)
    .set({ status: statusRaw, updatedAt: new Date() })
    .where(eq(customerRecommendations.id, id));

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "customer_recommendation",
    entityId: id,
    action: "status_updated",
    metadata: { status: statusRaw },
  });

  revalidatePath(`/dashboard/customers/${rec.customerId}`);
  return { success: "Status updated." };
}
