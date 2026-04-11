"use server";

import { eq, and, inArray, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { availabilityRules, blockedTimes, providers } from "@/db/schema";
import { plainTextFromInput } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { emitPlatformEvent } from "@/platform/events/emit";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import type { ActionState } from "@/domain/auth/actions";
import { emitOnboardingAvailabilityCompleted } from "@/lib/onboarding-platform-events";

function redirectAvailability(saved: "hours" | "blocked" | "pause", hash: string | undefined, formData: FormData) {
  const q = new URLSearchParams();
  q.set("saved", saved);
  if (formData.get("onboardingContext") === "1") q.set("onboarding", "1");
  const frag = hash ? `#${hash}` : "";
  redirect(`/dashboard/availability?${q.toString()}${frag}`);
}

async function activeAvailabilityRuleCount(db: ReturnType<typeof getDb>, providerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(availabilityRules)
    .where(and(eq(availabilityRules.providerId, providerId), eq(availabilityRules.isActive, true)));
  return Number(row?.n ?? 0);
}

async function maybeEmitAvailabilityOnboarding(
  db: ReturnType<typeof getDb>,
  ctx: Awaited<ReturnType<typeof loadProviderContext>>,
  activeBefore: number,
  activeAfter: number
) {
  if (activeBefore === 0 && activeAfter > 0) {
    await emitOnboardingAvailabilityCompleted(db, {
      providerId: ctx.providerId,
      userId: ctx.id,
      actorType: "user",
    });
  }
}

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
  const activeBefore = await activeAvailabilityRuleCount(db, ctx.providerId);
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

  const activeAfter = await activeAvailabilityRuleCount(db, ctx.providerId);
  await maybeEmitAvailabilityOnboarding(db, ctx, activeBefore, activeAfter);

  revalidatePath("/dashboard/availability");
  redirectAvailability("hours", "weekly-schedule", formData);
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
  await emitPlatformEvent(
    {
      name: "availability.rule.deleted",
      aggregateType: "availability_rule",
      aggregateId: id,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.id,
      actorType: "user",
      payload: { providerId: ctx.providerId, ruleId: id },
    },
    db
  );
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "availability_rule",
    entityId: id,
    action: "deleted",
  });
  revalidatePath("/dashboard/availability");
  redirectAvailability("hours", "weekly-schedule", formData);
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
  await emitPlatformEvent(
    {
      name: "availability.block.created",
      aggregateType: "blocked_time",
      aggregateId: row!.id,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.id,
      actorType: "user",
      payload: { providerId: ctx.providerId, blockId: row!.id },
    },
    db
  );
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
  redirectAvailability("blocked", "blocked-time-list", formData);
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
  await emitPlatformEvent(
    {
      name: "availability.block.deleted",
      aggregateType: "blocked_time",
      aggregateId: id,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.id,
      actorType: "user",
      payload: { providerId: ctx.providerId, blockId: id },
    },
    db
  );
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "blocked_time",
    entityId: id,
    action: "deleted",
  });
  revalidatePath("/dashboard/availability");
  redirectAvailability("blocked", "blocked-time-list", formData);
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
  await emitPlatformEvent(
    {
      name: "availability.block.deleted",
      aggregateType: "blocked_time",
      aggregateId: id,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.id,
      actorType: "user",
      payload: { providerId: ctx.providerId, blockId: id },
    },
    db
  );
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "blocked_time",
    entityId: id,
    action: "deleted",
  });
  revalidatePath("/dashboard/availability");
  return { ok: true };
}

export async function setBookingsPaused(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "setBookingsPaused" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const raw = formData.get("paused")?.toString();
  if (raw !== "true" && raw !== "false") return { error: "Invalid request." };
  const bookingsPaused = raw === "true";
  const db = getDb();
  await db
    .update(providers)
    .set({ bookingsPaused, updatedAt: new Date() })
    .where(eq(providers.id, ctx.providerId));
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "provider",
    entityId: ctx.providerId,
    action: bookingsPaused ? "bookings_paused" : "bookings_resumed",
  });
  const [p] = await db
    .select({ username: providers.username })
    .from(providers)
    .where(eq(providers.id, ctx.providerId))
    .limit(1);
  revalidatePath("/dashboard/availability");
  if (p?.username) revalidatePath(`/${p.username}`);
  redirectAvailability("pause", undefined, formData);
}

const WEEKDAY_DOW = [1, 2, 3, 4, 5] as const;

export async function applyWorkingHoursPreset(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "applyWorkingHoursPreset" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const preset = formData.get("preset")?.toString();
  if (preset !== "nine_to_five" && preset !== "evenings_only") {
    return { error: "Unknown preset." };
  }
  const windows =
    preset === "nine_to_five"
      ? WEEKDAY_DOW.map((dayOfWeek) => ({
          providerId: ctx.providerId,
          dayOfWeek,
          startTimeLocal: "09:00",
          endTimeLocal: "17:00",
          isActive: true,
        }))
      : WEEKDAY_DOW.map((dayOfWeek) => ({
          providerId: ctx.providerId,
          dayOfWeek,
          startTimeLocal: "17:00",
          endTimeLocal: "21:00",
          isActive: true,
        }));

  const db = getDb();
  const activeBefore = await activeAvailabilityRuleCount(db, ctx.providerId);
  await db.delete(availabilityRules).where(eq(availabilityRules.providerId, ctx.providerId));
  await db.insert(availabilityRules).values(windows);
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "availability_rule",
    entityId: "preset",
    action: "preset_applied",
  });
  const activeAfter = await activeAvailabilityRuleCount(db, ctx.providerId);
  await maybeEmitAvailabilityOnboarding(db, ctx, activeBefore, activeAfter);
  revalidatePath("/dashboard/availability");
  redirectAvailability("hours", "weekly-schedule", formData);
}

export async function applyHoursToWeekdays(formData: FormData): Promise<ActionState> {
  if (!(await csrfOk(formData, { action: "applyHoursToWeekdays" }))) return { error: "Invalid security token." };
  const ctx = await loadProviderContext();
  const startRaw = plainTextFromInput(formData.get("startTimeLocal")?.toString() ?? "", 8);
  const endRaw = plainTextFromInput(formData.get("endTimeLocal")?.toString() ?? "", 8);
  if (!/^\d{1,2}:\d{2}$/.test(startRaw) || !/^\d{1,2}:\d{2}$/.test(endRaw)) {
    return { error: "Use HH:MM format." };
  }
  const startTimeLocal = normalizeTimeLocal(startRaw);
  const endTimeLocal = normalizeTimeLocal(endRaw);
  if (!startTimeLocal || !endTimeLocal) {
    return { error: "Use HH:MM format." };
  }
  if (startTimeLocal >= endTimeLocal) {
    return { error: "End time must be after start." };
  }

  const db = getDb();
  const activeBefore = await activeAvailabilityRuleCount(db, ctx.providerId);
  await db
    .delete(availabilityRules)
    .where(
      and(eq(availabilityRules.providerId, ctx.providerId), inArray(availabilityRules.dayOfWeek, [...WEEKDAY_DOW]))
    );
  await db.insert(availabilityRules).values(
    WEEKDAY_DOW.map((dayOfWeek) => ({
      providerId: ctx.providerId,
      dayOfWeek,
      startTimeLocal,
      endTimeLocal,
      isActive: true,
    }))
  );
  await logAudit({
    actorUserId: ctx.id,
    actorType: "user",
    tenantProviderId: ctx.providerId,
    entityType: "availability_rule",
    entityId: "weekdays_bulk",
    action: "weekdays_applied",
  });
  const activeAfter = await activeAvailabilityRuleCount(db, ctx.providerId);
  await maybeEmitAvailabilityOnboarding(db, ctx, activeBefore, activeAfter);
  revalidatePath("/dashboard/availability");
  redirectAvailability("hours", "weekly-schedule", formData);
}
