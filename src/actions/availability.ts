"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { availabilityRules, blockedTimes } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";

/** Normalize "9:00" / "09:00" to "09:00" for storage and duplicate checks. */
function normalizeTimeLocal(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export async function upsertAvailabilityRule(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "upsertAvailabilityRule" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const db = getDb();
  const id = formData.get("id")?.toString();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startRaw = plainTextFromInput(formData.get("startTimeLocal")?.toString() ?? "", 8);
  const endRaw = plainTextFromInput(formData.get("endTimeLocal")?.toString() ?? "", 8);
  const isActive = formData.get("isActive") === "on";

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Invalid day." };
  }
  if (!/^\d{1,2}:\d{2}$/.test(startRaw) || !/^\d{1,2}:\d{2}$/.test(endRaw)) {
    return { error: "Use HH:MM format." };
  }
  const startTimeLocal = normalizeTimeLocal(startRaw);
  const endTimeLocal = normalizeTimeLocal(endRaw);
  if (!startTimeLocal || !endTimeLocal) {
    return { error: "Use HH:MM format." };
  }

  const siblings = await db
    .select({
      id: availabilityRules.id,
      startTimeLocal: availabilityRules.startTimeLocal,
      endTimeLocal: availabilityRules.endTimeLocal,
    })
    .from(availabilityRules)
    .where(and(eq(availabilityRules.providerId, ctx.providerId), eq(availabilityRules.dayOfWeek, dayOfWeek)));

  const isDuplicate = siblings.some((row) => {
    if (id && row.id === id) return false;
    const s = normalizeTimeLocal(row.startTimeLocal);
    const e = normalizeTimeLocal(row.endTimeLocal);
    return s === startTimeLocal && e === endTimeLocal;
  });
  if (isDuplicate) {
    return { error: "That weekly hours entry already exists." };
  }

  if (id) {
    const [row] = await db
      .select()
      .from(availabilityRules)
      .where(and(eq(availabilityRules.id, id), eq(availabilityRules.providerId, ctx.providerId)))
      .limit(1);
    if (!row) return { error: "Not found." };
    await db
      .update(availabilityRules)
      .set({
        dayOfWeek,
        startTimeLocal,
        endTimeLocal,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(availabilityRules.id, id));
  } else {
    await db.insert(availabilityRules).values({
      providerId: ctx.providerId,
      dayOfWeek,
      startTimeLocal,
      endTimeLocal,
      isActive,
    });
  }

  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "availability_rule",
    entityId: id ?? "new",
    action: id ? "updated" : "created",
  });

  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?saved=hours#weekly-schedule");
}

export async function deleteAvailabilityRule(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "deleteAvailabilityRule" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const db = getDb();
  const res = await db
    .delete(availabilityRules)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.providerId, ctx.providerId)))
    .returning({ id: availabilityRules.id });
  if (!res.length) return { error: "Not found." };
  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?saved=hours#weekly-schedule");
}

export type AddBlockedTimeInlineResult =
  | {
      ok: true;
      id: string;
      startsAtISO: string;
      endsAtISO: string;
      reason: string | null;
    }
  | { ok: false; error: string };

export type DeleteBlockedTimeInlineResult = { ok: true } | { ok: false; error: string };

async function insertBlockedTimeFromForm(
  formData: FormData,
  ctx: Awaited<ReturnType<typeof loadProviderContext>>
): Promise<
  | { ok: true; id: string; startsAt: Date; endsAt: Date; reason: string | null }
  | { ok: false; error: string }
> {
  const startsAt = new Date(formData.get("startsAt")?.toString() ?? "");
  const endsAt = new Date(formData.get("endsAt")?.toString() ?? "");
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { ok: false, error: "Invalid time range." };
  }
  const reason = plainTextFromInput(formData.get("reason")?.toString() ?? "", 500);
  const db = getDb();
  const [row] = await db
    .insert(blockedTimes)
    .values({
      providerId: ctx.providerId,
      startsAt,
      endsAt,
      reason: reason || null,
    })
    .returning({
      id: blockedTimes.id,
      startsAt: blockedTimes.startsAt,
      endsAt: blockedTimes.endsAt,
      reason: blockedTimes.reason,
    });
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "blocked_time",
    entityId: row!.id,
    action: "created",
  });
  return {
    ok: true,
    id: row!.id,
    startsAt: row!.startsAt,
    endsAt: row!.endsAt,
    reason: row!.reason,
  };
}

export async function addBlockedTime(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "addBlockedTime" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const inserted = await insertBlockedTimeFromForm(formData, ctx);
  if (!inserted.ok) return { error: inserted.error };
  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?saved=blocked#blocked-time-list");
}

/** Same as addBlockedTime but returns data for client-side calendar (no redirect). */
export async function addBlockedTimeInline(formData: FormData): Promise<AddBlockedTimeInlineResult> {
  if (!(await csrfOk(formData, { action: "addBlockedTimeInline" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const inserted = await insertBlockedTimeFromForm(formData, ctx);
  if (!inserted.ok) return { ok: false, error: inserted.error };
  revalidatePath("/dashboard/availability");
  return {
    ok: true,
    id: inserted.id,
    startsAtISO: inserted.startsAt.toISOString(),
    endsAtISO: inserted.endsAt.toISOString(),
    reason: inserted.reason,
  };
}

export async function deleteBlockedTime(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "deleteBlockedTime" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const db = getDb();
  const res = await db
    .delete(blockedTimes)
    .where(and(eq(blockedTimes.id, id), eq(blockedTimes.providerId, ctx.providerId)))
    .returning({ id: blockedTimes.id });
  if (!res.length) return { error: "Not found." };
  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?saved=blocked#blocked-time-list");
}

export async function deleteBlockedTimeInline(formData: FormData): Promise<DeleteBlockedTimeInlineResult> {
  if (!(await csrfOk(formData, { action: "deleteBlockedTimeInline" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("id")?.toString() ?? "";
  const db = getDb();
  const res = await db
    .delete(blockedTimes)
    .where(and(eq(blockedTimes.id, id), eq(blockedTimes.providerId, ctx.providerId)))
    .returning({ id: blockedTimes.id });
  if (!res.length) return { ok: false, error: "Not found." };
  revalidatePath("/dashboard/availability");
  return { ok: true };
}
