import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type LastMinuteOpeningPromptInput = {
  provider_name: string;
  service_name: string;
  available_time_window: string;
  location_or_remote: string;
  audience: "existing customers" | "all customers" | "new customers";
  channel: "email" | "sms" | "direct_message" | "social";
  tone: "warm" | "professional" | "casual";
};

export function buildLastMinuteOpeningPrompt(input: LastMinuteOpeningPromptInput): {
  system: string;
  user: string;
} {
  const user = `Task: Write a short message about a last-minute opening.

Context:
- Provider: ${input.provider_name}
- Service: ${input.service_name}
- Time window: ${input.available_time_window}
- Location / format: ${input.location_or_remote}
- Audience: ${input.audience}
- Channel: ${input.channel}
- Tone: ${input.tone}

Requirements:
- Helpful and timely, not frantic or salesy.
- Make the time window clear.
- One primary message and two shorter variations.
- Simple CTA.

Return a single JSON object only (no markdown), with keys:
- "title": short label (max 6 words)
- "primary_text": the main message body
- "alternatives": array of exactly 2 shorter alternative strings
- "cta": short call-to-action phrase
- "image_prompt": one sentence describing a calm marketing photo (no text in the image)`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
