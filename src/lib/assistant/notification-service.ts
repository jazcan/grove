import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { assistantSuggestions } from "@/db/schema";

export type AssistantFabUi = {
  badgeCount: number;
  pulse: boolean;
  /** Highest-priority unseen suggestion id for optional toast (client may dedupe). */
  toastSuggestionId: string | null;
};

/**
 * Quiet-first: badge for unread (new); pulse for medium+ unseen; toast id only for high-urgency toast-mode rows.
 */
export async function computeAssistantFabState(db: Database, providerId: string): Promise<AssistantFabUi> {
  const unread = await db
    .select({
      id: assistantSuggestions.id,
      urgencyLevel: assistantSuggestions.urgencyLevel,
      surfaceMode: assistantSuggestions.surfaceMode,
    })
    .from(assistantSuggestions)
    .where(and(eq(assistantSuggestions.providerId, providerId), eq(assistantSuggestions.status, "new")));

  const badgeCount = unread.length;
  const pulse = unread.some((r) => r.urgencyLevel === "medium" || r.urgencyLevel === "high");
  const toastCandidate = unread.find(
    (r) => r.urgencyLevel === "high" && r.surfaceMode === "toast"
  );

  return {
    badgeCount,
    pulse: pulse && badgeCount > 0,
    toastSuggestionId: toastCandidate?.id ?? null,
  };
}
