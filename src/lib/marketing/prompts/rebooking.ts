import { GROVE_MARKETING_SYSTEM_PROMPT } from "@/lib/marketing/system-prompt";

export type RebookingPromptInput = {
  provider_name: string;
  business_type: string;
  service_name: string;
  customer_first_name?: string;
  time_since_last_booking: string;
  tone: "warm" | "professional" | "casual";
  channel: "email" | "sms" | "direct_message";
  special_offer?: string;
  availability_note?: string;
};

export function buildRebookingPrompt(input: RebookingPromptInput): {
  system: string;
  user: string;
} {
  const greet = input.customer_first_name
    ? `Address the customer as ${input.customer_first_name} naturally (not overly formal).`
    : "Do not invent a name; keep the greeting neutral.";

  const offerLine = input.special_offer?.trim()
    ? `Mention this offer factually: ${input.special_offer.trim()}`
    : "Do not invent or imply a discount or offer.";

  const availLine = input.availability_note?.trim()
    ? `You may mention availability briefly: ${input.availability_note.trim()}`
    : "Do not mention availability or open slots.";

  const user = `Task: Write a short rebooking message for an existing client.

Context:
- Provider: ${input.provider_name}
- Business type: ${input.business_type}
- Service: ${input.service_name}
- Time since last booking (for tone only): ${input.time_since_last_booking}
- Tone: ${input.tone}
- Channel: ${input.channel} (adjust length accordingly)

${greet}
${offerLine}
${availLine}

Requirements:
- One primary message and two alternative versions (same intent, different wording).
- Personal and human, not automated.
- Light CTA toward booking again; no pressure.
- Keep ${input.channel === "sms" ? "SMS very concise (under 320 characters each)." : "email brief (under 120 words each)."}
- For direct_message, keep it conversational and medium length.

Return a single JSON object only (no markdown), with keys:
- "title": short label (max 6 words)
- "primary_text": the main message body
- "alternatives": array of exactly 2 alternative strings
- "cta": short call-to-action phrase
- "image_prompt": one sentence describing a calm marketing photo (no text in the image)`;

  return { system: GROVE_MARKETING_SYSTEM_PROMPT, user };
}
