import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type ImagePromptGeneratorInput = {
  business_type: string;
  service_name: string;
  season_or_event: string;
  mood: string;
  color_direction?: string;
  format: "square" | "portrait" | "landscape";
};

export function buildImagePromptGeneratorPrompt(input: ImagePromptGeneratorInput): {
  system: string;
  user: string;
} {
  const color = input.color_direction?.trim()
    ? `Color direction: ${input.color_direction.trim()}`
    : "Use a natural, cohesive palette; do not specify neon or stock-photo clichés.";

  const user = `Task: Write one image-generation prompt for a marketing post visual.

Context:
- Business type: ${input.business_type}
- Service: ${input.service_name}
- Season or occasion: ${input.season_or_event}
- Mood: ${input.mood}
- ${color}
- Aspect: ${input.format}

Requirements:
- Clean composition, not cluttered.
- Appropriate for a solo service brand.
- Describe subject, lighting, setting, and tone.
- No text or lettering in the image unless explicitly requested.
- Avoid cheesy stock-photo wording.

Return JSON only: {"image_prompt":"..."}`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
