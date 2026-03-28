import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export async function logAudit(input: {
  actorUserId: string | null;
  actorType: "user" | "system" | "customer";
  tenantProviderId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: input.actorUserId,
      actorType: input.actorType,
      tenantProviderId: input.tenantProviderId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata ?? null,
    });
  } catch (e) {
    console.error("[audit] insert failed", { action: input.action, entityType: input.entityType, error: e });
  }
}
