/**
 * Marketing generation entrypoint.
 * Reconnect: OpenAI when `OPENAI_API_KEY` is set (unless `MARKETING_AI_RECONNECT=false`), else mock.
 * Campaigns + studio: mock until wired.
 */

import type { MarketingGenerationOutput, ProviderMarketingContext, ReconnectMessageKind, ToneOption } from "@/lib/marketing/types";
import { buildReconnectPromptsForInput, mockCampaignOutput, mockReconnectOutput, mockStudioOutput } from "@/lib/marketing/mock-engine";
import { generateReconnectViaOpenAI, marketingReconnectLlmEnabled } from "@/lib/marketing/openai-reconnect";

export type MarketingGenerateReconnectInput = {
  ctx: ProviderMarketingContext;
  kind: ReconnectMessageKind;
  customerName: string;
  timeSinceLastBooking: string;
  tone: ToneOption;
  channel: "email" | "sms" | "direct_message";
  specialOffer?: string;
  availabilityNote?: string;
};

export type MarketingGenerateCampaignInput = {
  ctx: ProviderMarketingContext;
  title: string;
  campaignType: string;
  targetAudience: string;
  channel: "email" | "sms" | "social";
  tone: ToneOption;
  offerHint?: string;
};

export type MarketingGenerateStudioInput = {
  ctx: ProviderMarketingContext;
  serviceName: string;
  goal: "repeat" | "fill" | "new" | "offer";
  season: string;
  tone: ToneOption;
  channel: "email" | "sms" | "social";
};

export type GenerationTrace = {
  prompts: { system: string; user: string }[];
};

export type ReconnectGenerationSource = "openai" | "mock";

export async function generateReconnectDraft(
  input: MarketingGenerateReconnectInput,
  options?: { providerId: string | null }
): Promise<{
  output: MarketingGenerationOutput;
  trace: GenerationTrace;
  source: ReconnectGenerationSource;
}> {
  const prompts = buildReconnectPromptsForInput(input);
  const trace: GenerationTrace = { prompts: [prompts] };

  if (marketingReconnectLlmEnabled()) {
    const llm = await generateReconnectViaOpenAI({
      system: prompts.system,
      user: prompts.user,
      channel: input.channel,
      providerId: options?.providerId ?? null,
    });
    if (llm) {
      return { output: llm, trace, source: "openai" };
    }
  }

  const { output } = mockReconnectOutput(input);
  return { output, trace, source: "mock" };
}

export function generateCampaignCopy(input: MarketingGenerateCampaignInput): {
  output: MarketingGenerationOutput;
  trace: GenerationTrace;
} {
  const { output, prompts } = mockCampaignOutput(input);
  return { output, trace: { prompts: [prompts] } };
}

export function generateStudioContent(input: MarketingGenerateStudioInput): {
  output: MarketingGenerationOutput;
  trace: GenerationTrace;
} {
  const { output, prompts, imagePromptMeta } = mockStudioOutput(input);
  return { output, trace: { prompts: [prompts, imagePromptMeta] } };
}
