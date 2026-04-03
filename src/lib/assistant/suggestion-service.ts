import { and, desc, eq, inArray, isNull, lte, ne, notInArray, or } from "drizzle-orm";
import type { Database } from "@/db";
import { assistantSuggestions } from "@/db/schema";
import type { AssistantSuggestionStatus } from "@/platform/enums";
import { buildAssistantContextPacket, getProviderTimezone } from "@/lib/assistant/context-service";
import { buildDeterministicSuggestionCandidates, type SuggestionCandidate } from "@/lib/assistant/suggestion-rules";
import { MANAGED_SUGGESTION_TYPES } from "@/lib/assistant/constants";

function terminalStatuses(): AssistantSuggestionStatus[] {
  return ["dismissed", "snoozed", "acted"];
}

async function upsertCandidate(
  db: Database,
  providerId: string,
  c: SuggestionCandidate
): Promise<void> {
  const [existing] = await db
    .select()
    .from(assistantSuggestions)
    .where(
      and(eq(assistantSuggestions.providerId, providerId), eq(assistantSuggestions.dedupeKey, c.dedupeKey))
    )
    .limit(1);

  const now = new Date();
  const base = {
    providerId,
    dedupeKey: c.dedupeKey,
    type: c.type,
    title: c.title,
    summary: c.summary,
    priorityScore: c.priorityScore,
    urgencyLevel: c.urgencyLevel,
    surfaceMode: c.surfaceMode,
    relatedEntityType: c.relatedEntityType ?? null,
    relatedEntityId: c.relatedEntityId ?? null,
    reasonJson: c.reasonJson,
    actionPayloadJson: c.actionPayloadJson,
    expiresAt: c.expiresAt ?? null,
    updatedAt: now,
  };

  if (!existing) {
    await db.insert(assistantSuggestions).values({
      ...base,
      status: "new",
      createdAt: now,
    });
    return;
  }

  if (terminalStatuses().includes(existing.status as AssistantSuggestionStatus)) {
    await db
      .update(assistantSuggestions)
      .set({
        title: c.title,
        summary: c.summary,
        priorityScore: c.priorityScore,
        urgencyLevel: c.urgencyLevel,
        surfaceMode: c.surfaceMode,
        reasonJson: c.reasonJson,
        actionPayloadJson: c.actionPayloadJson,
        expiresAt: c.expiresAt ?? null,
        updatedAt: now,
      })
      .where(eq(assistantSuggestions.id, existing.id));
    return;
  }

  const keepSeen = existing.status === "seen";
  await db
    .update(assistantSuggestions)
    .set({
      ...base,
      status: keepSeen ? "seen" : "new",
    })
    .where(eq(assistantSuggestions.id, existing.id));
}

/**
 * Recompute deterministic suggestions and persist. Safe to call from layout or server actions.
 */
export async function syncAssistantSuggestionsForProvider(db: Database, providerId: string): Promise<void> {
  const now = new Date();
  await db
    .update(assistantSuggestions)
    .set({ status: "new", snoozedUntil: null, updatedAt: now })
    .where(
      and(
        eq(assistantSuggestions.providerId, providerId),
        eq(assistantSuggestions.status, "snoozed"),
        or(isNull(assistantSuggestions.snoozedUntil), lte(assistantSuggestions.snoozedUntil, now))
      )
    );

  const tz = await getProviderTimezone(db, providerId);
  const ctx = await buildAssistantContextPacket(db, providerId, tz);

  const candidates = await buildDeterministicSuggestionCandidates(
    db,
    providerId,
    tz,
    ctx.setup,
    ctx.preferences
  );

  const keys = new Set(candidates.map((c) => c.dedupeKey));
  for (const c of candidates) {
    await upsertCandidate(db, providerId, c);
  }

  const managedTypes = [...MANAGED_SUGGESTION_TYPES];
  await db
    .update(assistantSuggestions)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(assistantSuggestions.providerId, providerId),
        inArray(assistantSuggestions.type, managedTypes),
        notInArray(assistantSuggestions.dedupeKey, [...keys])
      )
    );
}

export type SuggestionRow = {
  id: string;
  type: string;
  title: string;
  summary: string;
  status: AssistantSuggestionStatus;
  urgencyLevel: string;
  priorityScore: number;
  dedupeKey: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionPayloadJson: Record<string, unknown>;
  createdAt: string;
};

export async function listActiveSuggestionsForUi(
  db: Database,
  providerId: string,
  limit = 40
): Promise<SuggestionRow[]> {
  const rows = await db
    .select({
      id: assistantSuggestions.id,
      type: assistantSuggestions.type,
      title: assistantSuggestions.title,
      summary: assistantSuggestions.summary,
      status: assistantSuggestions.status,
      urgencyLevel: assistantSuggestions.urgencyLevel,
      priorityScore: assistantSuggestions.priorityScore,
      dedupeKey: assistantSuggestions.dedupeKey,
      relatedEntityType: assistantSuggestions.relatedEntityType,
      relatedEntityId: assistantSuggestions.relatedEntityId,
      actionPayloadJson: assistantSuggestions.actionPayloadJson,
      createdAt: assistantSuggestions.createdAt,
    })
    .from(assistantSuggestions)
    .where(
      and(
        eq(assistantSuggestions.providerId, providerId),
        ne(assistantSuggestions.status, "expired"),
        or(
          inArray(assistantSuggestions.status, ["new", "seen"]),
          and(
            eq(assistantSuggestions.status, "snoozed"),
            or(
              isNull(assistantSuggestions.snoozedUntil),
              lte(assistantSuggestions.snoozedUntil, new Date())
            )
          )
        )
      )
    )
    .orderBy(desc(assistantSuggestions.priorityScore), desc(assistantSuggestions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function dismissSuggestion(
  db: Database,
  providerId: string,
  suggestionId: string
): Promise<boolean> {
  const [u] = await db
    .update(assistantSuggestions)
    .set({
      status: "dismissed",
      dismissedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(assistantSuggestions.providerId, providerId), eq(assistantSuggestions.id, suggestionId))
    )
    .returning({ id: assistantSuggestions.id });
  return !!u;
}

export async function snoozeSuggestion(
  db: Database,
  providerId: string,
  suggestionId: string,
  hours: number
): Promise<boolean> {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000);
  const [u] = await db
    .update(assistantSuggestions)
    .set({
      status: "snoozed",
      snoozedUntil: until,
      updatedAt: new Date(),
    })
    .where(
      and(eq(assistantSuggestions.providerId, providerId), eq(assistantSuggestions.id, suggestionId))
    )
    .returning({ id: assistantSuggestions.id });
  return !!u;
}

export async function markSuggestionSeen(
  db: Database,
  providerId: string,
  suggestionId: string
): Promise<boolean> {
  const [u] = await db
    .update(assistantSuggestions)
    .set({
      status: "seen",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assistantSuggestions.providerId, providerId),
        eq(assistantSuggestions.id, suggestionId),
        eq(assistantSuggestions.status, "new")
      )
    )
    .returning({ id: assistantSuggestions.id });
  return !!u;
}
