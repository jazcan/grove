import type {
  MarketingChannel,
  MarketingGenerationOutput,
  ProviderMarketingContext,
  ReconnectMessageKind,
  ToneOption,
} from "@/lib/marketing/types";
import {
  buildGeneralFollowUpPrompt,
  buildImagePromptGeneratorPrompt,
  buildLastMinuteOpeningPrompt,
  buildPromotionPrompt,
  buildRebookingPrompt,
  buildSocialPostPrompt,
} from "@/lib/marketing/prompts";
/** Deterministic mock: mirrors structured output shape. Prompts are built for future LLM wiring. */
function tonePhrase(tone: ToneOption): string {
  if (tone === "warm") return "It would be great to see you again when the timing is right.";
  if (tone === "professional") return "If you would like to book again, you can reach out whenever it suits you.";
  return "Whenever you want another session, just send a message.";
}

function channelLabel(ch: MarketingChannel): string {
  if (ch === "sms") return "Text";
  if (ch === "email") return "Email";
  if (ch === "social") return "Post";
  return "Message";
}

function firstOnly(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  return name.trim().split(/\s+/)[0];
}

/** Prompt pair for reconnect flows (shared by mock + OpenAI). */
export function buildReconnectPromptsForInput(args: {
  ctx: ProviderMarketingContext;
  kind: ReconnectMessageKind;
  customerName: string;
  timeSinceLastBooking: string;
  tone: ToneOption;
  channel: "email" | "sms" | "direct_message";
  specialOffer?: string;
  availabilityNote?: string;
}): { system: string; user: string } {
  const fn = firstOnly(args.customerName);
  const who = args.ctx.providerName;
  const service = args.ctx.primaryServiceName;

  const rebooking = buildRebookingPrompt({
    provider_name: who,
    business_type: args.ctx.businessType,
    service_name: service,
    customer_first_name: fn,
    time_since_last_booking: args.timeSinceLastBooking,
    tone: args.tone,
    channel: args.channel,
    special_offer: args.specialOffer,
    availability_note: args.availabilityNote,
  });

  const lastMinute = buildLastMinuteOpeningPrompt({
    provider_name: who,
    service_name: service,
    available_time_window: args.availabilityNote?.trim() || "this week",
    location_or_remote: "as you usually offer",
    audience: "existing customers",
    channel: args.channel === "direct_message" ? "direct_message" : args.channel,
    tone: args.tone,
  });

  const general = buildGeneralFollowUpPrompt({
    provider_name: who,
    business_type: args.ctx.businessType,
    service_name: service,
    customer_first_name: fn,
    time_since_last_booking: args.timeSinceLastBooking,
    tone: args.tone,
    channel: args.channel,
  });

  if (args.kind === "last_minute_opening") return lastMinute;
  if (args.kind === "general_follow_up") return general;
  return rebooking;
}

export function mockReconnectOutput(args: {
  ctx: ProviderMarketingContext;
  kind: ReconnectMessageKind;
  customerName: string;
  timeSinceLastBooking: string;
  tone: ToneOption;
  channel: "email" | "sms" | "direct_message";
  specialOffer?: string;
  availabilityNote?: string;
}): { output: MarketingGenerationOutput; prompts: { system: string; user: string } } {
  const fn = firstOnly(args.customerName);
  const hi = fn ? `Hi ${fn},` : "Hi,";
  const service = args.ctx.primaryServiceName;
  const who = args.ctx.providerName;

  const prompts = buildReconnectPromptsForInput(args);

  const offerBit = args.specialOffer?.trim() ? ` ${args.specialOffer.trim()}` : "";
  const availBit = args.availabilityNote?.trim() ? ` ${args.availabilityNote.trim()}` : "";

  let primary: string;
  let alt1: string;
  let alt2: string;
  let title: string;

  if (args.kind === "last_minute_opening") {
    title = "Last-minute opening";
    primary = `${hi} this is ${who}. I had a little time open for ${service}.${availBit} If a session would help right now, reply and we can find a time.`;
    alt1 = `${hi} quick note from ${who}: a spot opened up for ${service}.${availBit} Happy to fit you in if you are interested.`;
    alt2 = `${who} here — I have short-notice availability for ${service}.${availBit} Message me if you would like it.`;
  } else if (args.kind === "general_follow_up") {
    title = "Following up";
    primary = `${hi} hope you have been doing well. I have been thinking about past clients and wanted to check in. If you ever want another ${service} session with ${who}, I am here.${tonePhrase(args.tone)}`;
    alt1 = `${hi} just a quick hello from ${who}. If ${service} would be useful again sometime, reply anytime — no rush.`;
    alt2 = `${hi} checking in from ${who}. Still offering ${service} whenever it helps.`;
  } else {
    title = "Rebooking";
    primary = `${hi} it has been a little while since your last ${service} visit with ${who}.${offerBit}${availBit} ${tonePhrase(args.tone)}`;
    alt1 = `${hi} from ${who}: if you would like to book ${service} again, I would be glad to help.${offerBit ? ` ${offerBit}` : ""}`;
    alt2 = `${hi} whenever you are ready for another ${service}, ${who} has openings coming up.${availBit}`;
  }

  const ch: MarketingChannel = args.channel === "direct_message" ? "direct_message" : args.channel;

  const output: MarketingGenerationOutput = {
    title,
    primary_text: primary,
    alternatives: [alt1, alt2],
    cta: args.channel === "sms" ? "Reply to book" : "Reply when you are ready",
    image_prompt: `Soft natural light, calm workspace suggesting ${args.ctx.businessType || "wellness"} service, ${service}, minimal props, warm neutrals, ${args.tone} mood, no text, square composition.`,
    channel: ch,
  };

  if (args.channel === "sms") {
    const shorten = (s: string) => (s.length > 300 ? `${s.slice(0, 297)}...` : s);
    output.primary_text = shorten(output.primary_text);
    output.alternatives = output.alternatives.map(shorten);
  }

  return { output, prompts };
}

export function mockCampaignOutput(args: {
  ctx: ProviderMarketingContext;
  title: string;
  campaignType: string;
  targetAudience: string;
  channel: "email" | "sms" | "social";
  tone: ToneOption;
  offerHint?: string;
}): { output: MarketingGenerationOutput; prompts: { system: string; user: string } } {
  const promotion = buildPromotionPrompt({
    provider_name: args.ctx.providerName,
    service_name: args.ctx.primaryServiceName,
    promotion_type: args.campaignType,
    offer_details: args.offerHint?.trim() || `${args.title} — simple, clear offer for ${args.targetAudience}.`,
    target_audience: args.targetAudience,
    channel: args.channel === "social" ? "social" : args.channel,
    tone: args.tone,
  });

  const who = args.ctx.providerName;
  const svc = args.ctx.primaryServiceName;
  const aud = args.targetAudience.toLowerCase();

  const close = tonePhrase(args.tone);
  const primary = `${who} here — a quick note for ${aud}: ${args.offerHint?.trim() || `something simple around ${args.campaignType.replace(/_/g, " ")} for ${svc}.`} If it is useful, reach out and we will sort the details. ${close}`;
  const alt1 = `Short version: ${who} is sharing a straightforward ${args.campaignType.replace(/_/g, " ")} for ${svc}. Message if you want in.`;
  const alt2 = `Friendly version: Hey — ${who} wanted you to know about ${svc}. ${args.offerHint?.trim() || "Nothing complicated — just ask if you have questions."}`;

  const mapCh = (): MarketingChannel => {
    if (args.channel === "sms") return "sms";
    if (args.channel === "social") return "social";
    return "email";
  };

  const output: MarketingGenerationOutput = {
    title: args.title,
    primary_text: primary,
    alternatives: [alt1, alt2],
    cta: mapCh() === "sms" ? "Text to book" : "Reach out to book",
    image_prompt: `Editorial photo mood for ${svc}, solo provider setting, ${args.tone} atmosphere, soft daylight, uncluttered, no text, square.`,
    channel: mapCh(),
  };

  if (args.channel === "sms") {
    const shorten = (s: string) => (s.length > 300 ? `${s.slice(0, 297)}...` : s);
    output.primary_text = shorten(output.primary_text);
    output.alternatives = output.alternatives.map(shorten);
  }

  return { output, prompts: promotion };
}

export function mockStudioOutput(args: {
  ctx: ProviderMarketingContext;
  serviceName: string;
  goal: "repeat" | "fill" | "new" | "offer";
  season: string;
  tone: ToneOption;
  channel: "email" | "sms" | "social";
}): { output: MarketingGenerationOutput; prompts: { system: string; user: string }; imagePromptMeta: { system: string; user: string } } {
  const goalMap = {
    repeat: "remind existing clients" as const,
    fill: "attract new clients" as const,
    new: "attract new clients" as const,
    offer: "announce offer" as const,
  };

  const social = buildSocialPostPrompt({
    provider_name: args.ctx.providerName,
    business_type: args.ctx.businessType,
    service_name: args.serviceName,
    season_or_event: args.season,
    goal: goalMap[args.goal],
    tone: args.tone,
    include_cta: true,
  });

  const imageMeta = buildImagePromptGeneratorPrompt({
    business_type: args.ctx.businessType,
    service_name: args.serviceName,
    season_or_event: args.season,
    mood: args.tone,
    format: "square",
  });

  const who = args.ctx.providerName;
  const svc = args.serviceName;

  let angle: string;
  if (args.goal === "repeat") angle = `a gentle nudge for people who already know ${who}`;
  else if (args.goal === "fill") angle = `a helpful note about open time this ${args.season}`;
  else if (args.goal === "new") angle = `a clear intro to ${svc} for someone new`;
  else angle = `a simple, honest limited offer for ${svc}`;

  const primary = `${who} — ${channelLabel(args.channel === "social" ? "social" : args.channel)} idea (${args.season}): ${angle}. ${svc} is available when you need it. If you want a time, message me and we will set it up.`;
  const alt1 = `Shorter: ${who} / ${svc} — ${args.season}. Message me for availability.`;
  const alt2 = `More polished: This ${args.season}, ${who} is taking bookings for ${svc}. Reach out to schedule at your convenience.`;

  const mapCh = (): MarketingChannel => {
    if (args.channel === "sms") return "sms";
    if (args.channel === "social") return "social";
    return "email";
  };

  const output: MarketingGenerationOutput = {
    title: `${svc} — ${args.season}`,
    primary_text: primary,
    alternatives: [alt1, alt2],
    cta: "Message for availability",
    image_prompt: `Single calm scene representing ${svc} (${args.ctx.businessType}), ${args.season} feeling, ${args.tone} mood, natural light, generous negative space, no text, square format.`,
    channel: mapCh(),
  };

  if (args.channel === "sms") {
    const shorten = (s: string) => (s.length > 300 ? `${s.slice(0, 297)}...` : s);
    output.primary_text = shorten(output.primary_text);
    output.alternatives = output.alternatives.map(shorten);
  }

  return { output, prompts: social, imagePromptMeta: imageMeta };
}
