import type { Database } from "@/db";
import { getDb } from "@/db";
import { platformEvents } from "@/db/schema";
import type { PlatformEventActor } from "@/platform/enums";
import type { PlatformEventName, PlatformEventPayloads } from "@/platform/events/types";

const SCHEMA_VERSION = 1;

type EmitArgs<N extends PlatformEventName> = {
  name: N;
  aggregateType: string;
  aggregateId: string;
  payload: N extends keyof PlatformEventPayloads ? PlatformEventPayloads[N] : Record<string, unknown>;
  tenantProviderId: string | null;
  actorUserId: string | null;
  actorType: PlatformEventActor;
  correlationId?: string | null;
  causationEventId?: string | null;
};

/**
 * Persists an append-only platform event. Pass the same `db` / transaction as the mutation so the event
 * commits atomically with the write.
 */
export async function emitPlatformEvent<N extends PlatformEventName>(
  args: EmitArgs<N>,
  db: Database = getDb()
): Promise<{ id: string }> {
  const [row] = await db
    .insert(platformEvents)
    .values({
      eventName: args.name,
      aggregateType: args.aggregateType,
      aggregateId: args.aggregateId,
      payload: args.payload as Record<string, unknown>,
      tenantProviderId: args.tenantProviderId,
      actorUserId: args.actorUserId,
      actorType: args.actorType,
      correlationId: args.correlationId ?? null,
      causationEventId: args.causationEventId ?? null,
      schemaVersion: SCHEMA_VERSION,
    })
    .returning({ id: platformEvents.id });
  if (!row) {
    throw new Error(`[platform-events] insert returned no row for ${args.name}`);
  }
  return { id: row.id };
}
