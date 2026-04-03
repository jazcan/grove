import type { Database } from "@/db";
import { assistantEvents } from "@/db/schema";

export type RecordAssistantEventInput = {
  providerId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

/**
 * Append-only assistant event log (audit + future projections).
 */
export async function recordAssistantEvent(db: Database, input: RecordAssistantEventInput): Promise<void> {
  await db.insert(assistantEvents).values({
    providerId: input.providerId,
    eventType: input.eventType,
    payload: input.payload ?? {},
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
  });
}
