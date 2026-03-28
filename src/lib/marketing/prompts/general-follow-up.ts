import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type GeneralFollowUpPromptInput = {
  provider_name: string;
  business_type: string;
  service_name: string;
  customer_first_name?: string;
  time_since_last_booking: string;
  tone: "warm" | "professional" | "casual";
  channel: "email" | "sms" | "direct_message";
};

export function buildGeneralFollowUpPrompt(input: GeneralFollowUpPromptInput): {
  system: string;
  user: string;
} {
  const greet = input.customer_first_name
    ? `You may greet ${input.customer_first_name} naturally.`
    : "Keep the opening neutral without inventing a name.";

  const user = `Task: Write a gentle general follow-up to a past or existing customer.

Context:
- Provider: ${input.provider_name}
- Business type: ${input.business_type}
- Service: ${input.service_name}
- Time since last interaction: ${input.time_since_last_booking}
- Tone: ${input.tone}
- Channel: ${input.channel}

${greet}

Requirements:
- Check in warmly; do not hard-sell a rebook.
- Mention the service naturally if it fits.
- One primary message and two alternative versions.
- Light optional CTA (e.g. reply if they need anything).

Return a single JSON object only (no markdown), with keys:
- "title": short label (max 6 words)
- "primary_text": the main message body
- "alternatives": array of exactly 2 alternative strings
- "cta": short call-to-action phrase
- "image_prompt": one sentence describing a calm marketing photo (no text in the image)`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
