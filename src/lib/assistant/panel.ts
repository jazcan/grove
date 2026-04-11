import type { Database } from "@/db";
import { buildAssistantContextPacket, getProviderTimezone } from "@/lib/assistant/context-service";
import { normalizeDates } from "@/lib/normalize-dates";
import { computeAssistantFabState } from "@/lib/assistant/notification-service";
import { getOrCreateConversation, listRecentMessages } from "@/lib/assistant/conversation-service";
import { listActiveSuggestionsForUi, syncAssistantSuggestionsForProvider } from "@/lib/assistant/suggestion-service";
import type { AssistantContextPacket } from "@/lib/assistant/context-service";
import type { SuggestionRow } from "@/lib/assistant/suggestion-service";
import type { AssistantFabUi } from "@/lib/assistant/notification-service";

export type AssistantPanelSnapshot = {
  context: AssistantContextPacket;
  suggestions: SuggestionRow[];
  fab: AssistantFabUi;
  messages: { id: string; role: string; body: string; createdAt: string }[];
  conversationId: string | null;
  /** False when assistant DB tables are missing or persistence failed; Today/Ask still work from core data. */
  persistenceReady: boolean;
  /** True when live queries failed and the packet is a safe empty fallback. */
  contextLoadFailed?: boolean;
};

/**
 * RSC → client components only accept plain serializable values. Strip `Date` instances
 * (e.g. from jsonb payloads) so Flight does not throw.
 */
export function cloneAssistantPanelSnapshotForClient(
  snapshot: AssistantPanelSnapshot
): AssistantPanelSnapshot {
  return JSON.parse(JSON.stringify(normalizeDates(snapshot))) as AssistantPanelSnapshot;
}

function fallbackAssistantPanelSnapshot(
  timezone: string,
  contextLoadFailed: boolean
): AssistantPanelSnapshot {
  return cloneAssistantPanelSnapshotForClient({
    context: {
      timezone,
      setup: {
        hasIdentity: false,
        hasServices: false,
        hasAvailability: false,
        isPublished: false,
        needsSetup: true,
        activeServiceCount: 0,
        pendingBookingCount: 0,
        todayBookingCount: 0,
        customerCount: 0,
        onboardingWalkthroughCompletedAt: null,
        onboardingTailPending: false,
      },
      todayBookings: [],
      unpaidCompletedSample: [],
      lapsedCustomerCount: 0,
      lowActivityServiceCount: 0,
      recentEvents: [],
      activeSuggestionsPreview: [],
      preferences: { disabledSuggestionTypes: [], quietMode: false },
    },
    suggestions: [],
    fab: { badgeCount: 0, pulse: false, toastSuggestionId: null },
    messages: [],
    conversationId: null,
    persistenceReady: false,
    contextLoadFailed,
  });
}

/**
 * Loads assistant UI data. Does not throw: returns a safe fallback if queries or serialization fail
 * so the dashboard shell always gets a serializable snapshot for providers.
 */
export async function loadAssistantPanelSnapshot(
  db: Database,
  providerId: string,
  userId: string
): Promise<AssistantPanelSnapshot> {
  try {
    const tz = await getProviderTimezone(db, providerId);
    const context = await buildAssistantContextPacket(db, providerId, tz);

    let suggestions: SuggestionRow[] = [];
    let fab: AssistantFabUi = { badgeCount: 0, pulse: false, toastSuggestionId: null };
    let messages: AssistantPanelSnapshot["messages"] = [];
    let conversationId: string | null = null;
    let persistenceReady = false;

    try {
      await syncAssistantSuggestionsForProvider(db, providerId);
      suggestions = await listActiveSuggestionsForUi(db, providerId);
      fab = await computeAssistantFabState(db, providerId);
      const conv = await getOrCreateConversation(db, { providerId, userId });
      conversationId = conv.id;
      messages = await listRecentMessages(db, conv.id, 40);
      persistenceReady = true;
    } catch (e) {
      console.warn(
        "[assistant] persistence layer unavailable — run migration drizzle/0015_assistant_foundation.sql for suggestions and chat storage.",
        e
      );
    }

    return cloneAssistantPanelSnapshotForClient({
      context,
      suggestions,
      fab,
      messages,
      conversationId,
      persistenceReady,
      contextLoadFailed: false,
    });
  } catch (e) {
    console.error("[assistant] failed to build context packet; using empty fallback.", e);
    let tz = "America/Toronto";
    try {
      tz = await getProviderTimezone(db, providerId);
    } catch {
      /* keep default */
    }
    return fallbackAssistantPanelSnapshot(tz, true);
  }
}
