import { z } from "zod";
import { recordAiUsage } from "@/lib/ai-gateway";
import type { MarketingChannel, MarketingGenerationOutput } from "@/lib/marketing/types";

const reconnectJsonSchema = z.object({
  title: z.string().min(1).max(200),
  primary_text: z.string().min(1).max(12000),
  alternatives: z.array(z.string().min(1)).length(2),
  cta: z.string().min(1).max(300),
  image_prompt: z.string().min(1).max(4000),
});

function stripMarkdownFence(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function truncateSmsFields(out: MarketingGenerationOutput): void {
  const shorten = (s: string) => (s.length > 300 ? `${s.slice(0, 297)}...` : s);
  out.primary_text = shorten(out.primary_text);
  out.alternatives = out.alternatives.map(shorten);
}

function channelFromInput(ch: "email" | "sms" | "direct_message"): MarketingChannel {
  return ch === "direct_message" ? "direct_message" : ch;
}

/** When unset or not "false", reconnect may use OpenAI if OPENAI_API_KEY is set. */
export function marketingReconnectLlmEnabled(): boolean {
  if (process.env.MARKETING_AI_RECONNECT === "false") return false;
  return !!process.env.OPENAI_API_KEY?.trim();
}

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

/**
 * Calls OpenAI Chat Completions (JSON mode). Returns null on any failure (caller falls back to mock).
 */
export async function generateReconnectViaOpenAI(input: {
  system: string;
  user: string;
  channel: "email" | "sms" | "direct_message";
  providerId: string | null;
}): Promise<MarketingGenerationOutput | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.MARKETING_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userContent = input.user;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.65,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    console.error("[marketing/reconnect/openai] fetch failed", e);
    return null;
  }

  let body: OpenAiChatResponse;
  try {
    body = (await res.json()) as OpenAiChatResponse;
  } catch {
    return null;
  }

  if (!res.ok) {
    console.error("[marketing/reconnect/openai] API error", res.status, body?.error?.message);
    return null;
  }

  const raw = body.choices?.[0]?.message?.content;
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFence(raw));
  } catch (e) {
    console.error("[marketing/reconnect/openai] JSON parse failed", e);
    return null;
  }

  const checked = reconnectJsonSchema.safeParse(parsed);
  if (!checked.success) {
    console.error("[marketing/reconnect/openai] schema mismatch", checked.error.flatten());
    return null;
  }

  const d = checked.data;
  const output: MarketingGenerationOutput = {
    title: d.title,
    primary_text: d.primary_text,
    alternatives: d.alternatives,
    cta: d.cta,
    image_prompt: d.image_prompt,
    channel: channelFromInput(input.channel),
  };

  if (input.channel === "sms") {
    truncateSmsFields(output);
  }

  void recordAiUsage({
    providerId: input.providerId,
    feature: "marketing_reconnect",
    model,
    promptTokens: body.usage?.prompt_tokens ?? 0,
    completionTokens: body.usage?.completion_tokens ?? 0,
  });

  return output;
}
