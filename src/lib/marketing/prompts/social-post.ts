import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type SocialPostGoal = "attract new clients" | "remind existing clients" | "announce offer";

export type SocialPostPromptInput = {
  provider_name: string;
  business_type: string;
  service_name: string;
  season_or_event: string;
  goal: SocialPostGoal;
  tone: "warm" | "professional" | "casual";
  include_cta: boolean;
};

export function buildSocialPostPrompt(input: SocialPostPromptInput): {
  system: string;
  user: string;
} {
  const user = `Task: Write a short social post (Instagram/Facebook/LinkedIn style).

Context:
- Provider: ${input.provider_name}
- Business type: ${input.business_type}
- Service: ${input.service_name}
- Season or occasion: ${input.season_or_event}
- Goal: ${input.goal}
- Tone: ${input.tone}
- Include CTA: ${input.include_cta ? "yes — one light CTA" : "no explicit CTA sentence"}

Requirements:
- One clear message, human and grounded.
- One primary post, one shorter version, one slightly more polished professional version.
- No hashtags unless essential; no emojis unless they fit naturally.

Return JSON only:
{"primary":"...","alternatives":["shorter","more polished"]}`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
