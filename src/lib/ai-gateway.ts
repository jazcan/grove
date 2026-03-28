import { getDb } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Server-side only AI gateway stub (PRD §8.5). No public LLM endpoints.
 * Logs usage when enabled via feature flag + env.
 */
export async function recordAiUsage(input: {
  providerId: string | null;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  const enabled = await isFeatureEnabled("ai_gateway");
  if (!enabled && process.env.FEATURE_AI_GATEWAY !== "true") return;
  const db = getDb();
  await db.insert(aiUsageLogs).values({
    providerId: input.providerId,
    feature: input.feature,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
  });
}

export async function assertAiGatewayAllowed(): Promise<void> {
  const enabled = await isFeatureEnabled("ai_gateway");
  if (!enabled && process.env.FEATURE_AI_GATEWAY !== "true") {
    throw new Error("AI features are disabled.");
  }
}
