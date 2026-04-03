"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { csrfOk, loadProviderContext } from "@/actions/_guard";
import { buildAssistantContextPacket, getProviderTimezone } from "@/lib/assistant/context-service";
import { buildDeterministicAssistantReply, maybeRephraseAssistantReply } from "@/lib/assistant/ask";
import { appendMessage, getOrCreateConversation, listRecentMessages } from "@/lib/assistant/conversation-service";
import { loadAssistantPanelSnapshot } from "@/lib/assistant/panel";
import {
  dismissSuggestion,
  markSuggestionSeen,
  snoozeSuggestion,
  syncAssistantSuggestionsForProvider,
} from "@/lib/assistant/suggestion-service";
import { recordAssistantEvent } from "@/lib/assistant/event-service";
import type { AssistantPanelSnapshot } from "@/lib/assistant/panel";
import { plainTextFromInput } from "@/lib/sanitize";

export async function refreshAssistantPanel(): Promise<AssistantPanelSnapshot | { error: string }> {
  try {
    const ctx = await loadProviderContext();
    const db = getDb();
    return await loadAssistantPanelSnapshot(db, ctx.providerId, ctx.id);
  } catch (e) {
    console.error("[assistant] refreshAssistantPanel", e);
    return { error: "Could not load assistant." };
  }
}

export async function dismissAssistantSuggestion(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await csrfOk(formData, { action: "dismissAssistantSuggestion" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("suggestionId")?.toString() ?? "";
  if (!id) return { ok: false, error: "Missing suggestion." };
  const db = getDb();
  const ok = await dismissSuggestion(db, ctx.providerId, id);
  if (!ok) return { ok: false, error: "Not found." };
  await recordAssistantEvent(db, {
    providerId: ctx.providerId,
    eventType: "suggestion.dismissed",
    payload: { suggestionId: id },
    relatedEntityType: "assistant_suggestion",
    relatedEntityId: id,
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function snoozeAssistantSuggestion(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await csrfOk(formData, { action: "snoozeAssistantSuggestion" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("suggestionId")?.toString() ?? "";
  const hoursRaw = formData.get("hours")?.toString() ?? "24";
  const hours = Math.min(168, Math.max(1, Number.parseInt(hoursRaw, 10) || 24));
  if (!id) return { ok: false, error: "Missing suggestion." };
  const db = getDb();
  const ok = await snoozeSuggestion(db, ctx.providerId, id, hours);
  if (!ok) return { ok: false, error: "Not found." };
  await recordAssistantEvent(db, {
    providerId: ctx.providerId,
    eventType: "suggestion.snoozed",
    payload: { suggestionId: id, hours },
    relatedEntityType: "assistant_suggestion",
    relatedEntityId: id,
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAssistantSuggestionSeen(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await csrfOk(formData, { action: "markAssistantSuggestionSeen" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const id = formData.get("suggestionId")?.toString() ?? "";
  if (!id) return { ok: false, error: "Missing suggestion." };
  const db = getDb();
  await markSuggestionSeen(db, ctx.providerId, id);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function sendAssistantMessage(formData: FormData): Promise<
  | { ok: true; reply: string; messages: { id: string; role: string; body: string; createdAt: string }[] }
  | { ok: false; error: string }
> {
  if (!(await csrfOk(formData, { action: "sendAssistantMessage" }))) {
    return { ok: false, error: "Invalid security token." };
  }
  const ctx = await loadProviderContext();
  const raw = formData.get("message")?.toString() ?? "";
  const message = plainTextFromInput(raw, 4000);
  if (!message.trim()) return { ok: false, error: "Enter a message." };

  const db = getDb();
  const tz = await getProviderTimezone(db, ctx.providerId);
  const context = await buildAssistantContextPacket(db, ctx.providerId, tz);
  const deterministic = buildDeterministicAssistantReply(message, context);
  const reply = await maybeRephraseAssistantReply(deterministic);

  try {
    const conv = await getOrCreateConversation(db, { providerId: ctx.providerId, userId: ctx.id });
    await appendMessage(db, { conversationId: conv.id, role: "user", body: message });
    await appendMessage(db, { conversationId: conv.id, role: "assistant", body: reply });
    try {
      await recordAssistantEvent(db, {
        providerId: ctx.providerId,
        eventType: "assistant.ask",
        payload: { length: message.length },
      });
    } catch {
      /* assistant_events optional until migration */
    }
    const messages = await listRecentMessages(db, conv.id, 40);
    revalidatePath("/dashboard");
    return { ok: true, reply, messages };
  } catch (e) {
    console.warn("[assistant] Ask reply without chat persistence (apply assistant migration).", e);
    const now = new Date().toISOString();
    return {
      ok: true,
      reply,
      messages: [
        { id: "local-user", role: "user", body: message, createdAt: now },
        { id: "local-assistant", role: "assistant", body: reply, createdAt: now },
      ],
    };
  }
}

export async function runAssistantSyncForProvider(): Promise<{ ok: true } | { ok: false }> {
  try {
    const ctx = await loadProviderContext();
    const db = getDb();
    await syncAssistantSuggestionsForProvider(db, ctx.providerId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    console.error("[assistant] runAssistantSyncForProvider", e);
    return { ok: false };
  }
}
