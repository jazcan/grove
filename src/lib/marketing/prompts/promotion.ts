import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type PromotionPromptInput = {
  provider_name: string;
  service_name: string;
  promotion_type: string;
  offer_details: string;
  valid_until?: string;
  target_audience: string;
  channel: "email" | "sms" | "social" | "direct_message";
  tone: "warm" | "professional" | "casual";
};

export function buildPromotionPrompt(input: PromotionPromptInput): {
  system: string;
  user: string;
} {
  const deadline = input.valid_until?.trim()
    ? `Deadline / valid until: ${input.valid_until.trim()}`
    : "Do not invent a deadline.";

  const user = `Task: Write a believable promotional message for a solo service provider.

Context:
- Provider: ${input.provider_name}
- Service: ${input.service_name}
- Promotion type: ${input.promotion_type}
- Offer details: ${input.offer_details}
- ${deadline}
- Target audience: ${input.target_audience}
- Channel: ${input.channel}
- Tone: ${input.tone}

Requirements:
- Clear offer, no hype language.
- One main version, one shorter version, one slightly friendlier version.
- Clear CTA.
- Suitable for a solo provider, not a big brand.

Return JSON only:
{"primary":"...","alternatives":["shorter version here","friendlier version here"]}`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
