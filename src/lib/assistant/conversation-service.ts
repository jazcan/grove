import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { assistantConversations, assistantMessages } from "@/db/schema";

export async function getOrCreateConversation(
  db: Database,
  input: { providerId: string; userId: string }
): Promise<{ id: string }> {
  const [existing] = await db
    .select({ id: assistantConversations.id })
    .from(assistantConversations)
    .where(
      and(
        eq(assistantConversations.providerId, input.providerId),
        eq(assistantConversations.userId, input.userId)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(assistantConversations)
    .values({
      providerId: input.providerId,
      userId: input.userId,
    })
    .returning({ id: assistantConversations.id });

  if (!created) throw new Error("CONVERSATION_CREATE_FAILED");
  return created;
}

export async function listRecentMessages(
  db: Database,
  conversationId: string,
  limit = 30
): Promise<{ id: string; role: string; body: string; createdAt: string }[]> {
  const rows = await db
    .select({
      id: assistantMessages.id,
      role: assistantMessages.role,
      body: assistantMessages.body,
      createdAt: assistantMessages.createdAt,
    })
    .from(assistantMessages)
    .where(eq(assistantMessages.conversationId, conversationId))
    .orderBy(desc(assistantMessages.createdAt))
    .limit(limit);
  return rows.reverse().map((r) => ({
    id: r.id,
    role: r.role,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function appendMessage(
  db: Database,
  input: { conversationId: string; role: "user" | "assistant"; body: string }
): Promise<void> {
  await db.insert(assistantMessages).values({
    conversationId: input.conversationId,
    role: input.role,
    body: input.body,
  });
  await db
    .update(assistantConversations)
    .set({ updatedAt: new Date() })
    .where(eq(assistantConversations.id, input.conversationId));
}
