/** Structured marketing generation result — matches the intended LLM JSON shape. */
export type MarketingChannel = "email" | "sms" | "social" | "direct_message";

export type MarketingGenerationOutput = {
  title: string;
  primary_text: string;
  alternatives: string[];
  cta: string;
  image_prompt: string;
  channel: MarketingChannel;
};

export type ReconnectMessageKind = "rebooking" | "last_minute_opening" | "general_follow_up";

export type ToneOption = "warm" | "professional" | "casual";

/** Bundle passed to prompt builders + mock layer (provider context). */
export type ProviderMarketingContext = {
  providerName: string;
  businessType: string;
  primaryServiceName: string;
};
