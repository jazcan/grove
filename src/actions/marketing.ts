"use server";

import { z } from "zod";
import { desc, eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  bookings,
  customers,
  marketingCampaigns,
  marketingSavedContents,
  providers,
  services,
} from "@/db/schema";
import { loadProviderContext } from "@/actions/_guard";
import { validateCsrfToken } from "@/lib/csrf";
import { plainTextFromInput } from "@/lib/sanitize";
import {
  generateCampaignCopy,
  generateReconnectDraft,
  generateStudioContent,
  type ReconnectGenerationSource,
} from "@/lib/marketing/generate";
import type { MarketingGenerationOutput } from "@/lib/marketing/types";

export type MarketingReconnectGenerateData = {
  output: MarketingGenerationOutput;
  source: ReconnectGenerationSource;
};

export type MarketingActionOk<T> = { ok: true; data: T };
export type MarketingActionErr = { ok: false; error: string };
export type MarketingActionResult<T> = MarketingActionOk<T> | MarketingActionErr;

async function assertCsrf(token: string | undefined): Promise<boolean> {
  return validateCsrfToken(token);
}

async function loadMarketingContext(): Promise<
  | { ok: true; providerId: string; ctx: { providerName: string; businessType: string; primaryServiceName: string } }
  | { ok: false; error: string }
> {
  const u = await loadProviderContext();
  const db = getDb();
  const [p] = await db
    .select({
      displayName: providers.displayName,
      businessName: providers.businessName,
      category: providers.category,
    })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  if (!p) return { ok: false, error: "Provider not found." };

  const [svc] = await db
    .select({ name: services.name })
    .from(services)
    .where(and(eq(services.providerId, u.providerId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name))
    .limit(1);

  const providerName = (p.businessName?.trim() || p.displayName).slice(0, 200);
  const businessType = (p.category?.trim() || "service provider").slice(0, 120);
  const primaryServiceName = (svc?.name?.trim() || "your service").slice(0, 200);

  return {
    ok: true,
    providerId: u.providerId,
    ctx: { providerName, businessType, primaryServiceName },
  };
}

const reconnectInput = z.object({
  kind: z.enum(["rebooking", "last_minute_opening", "general_follow_up"]),
  customerId: z.string().uuid(),
  tone: z.enum(["warm", "professional", "casual"]),
  channel: z.enum(["email", "sms", "direct_message"]),
  specialOffer: z.string().max(500).optional(),
  availabilityNote: z.string().max(500).optional(),
});

export async function marketingGenerateReconnect(
  csrfToken: string,
  raw: z.infer<typeof reconnectInput>
): Promise<MarketingActionResult<MarketingReconnectGenerateData>> {
  if (!(await assertCsrf(csrfToken))) return { ok: false, error: "Invalid security token." };
  const parsed = reconnectInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const base = await loadMarketingContext();
  if (!base.ok) return { ok: false, error: base.error };

  const db = getDb();
  const [cust] = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
    })
    .from(customers)
    .where(and(eq(customers.id, parsed.data.customerId), eq(customers.providerId, base.providerId)))
    .limit(1);
  if (!cust) return { ok: false, error: "Customer not found." };

  const [lastRow] = await db
    .select({ startsAt: bookings.startsAt })
    .from(bookings)
    .where(and(eq(bookings.providerId, base.providerId), eq(bookings.customerId, cust.id)))
    .orderBy(desc(bookings.startsAt))
    .limit(1);
  const last = lastRow?.startsAt ?? null;
  let timeSince: string;
  if (!last) {
    timeSince = "no previous booking on file";
  } else {
    const days = Math.floor((Date.now() - last.getTime()) / 86400000);
    if (days < 1) timeSince = "within the last day";
    else if (days === 1) timeSince = "about a day ago";
    else if (days < 14) timeSince = `about ${days} days ago`;
    else if (days < 60) timeSince = `about ${Math.round(days / 7)} weeks ago`;
    else timeSince = `about ${Math.round(days / 30)} months ago`;
  }

  const { output, source } = await generateReconnectDraft(
    {
      ctx: base.ctx,
      kind: parsed.data.kind,
      customerName: cust.fullName,
      timeSinceLastBooking: timeSince,
      tone: parsed.data.tone,
      channel: parsed.data.channel,
      specialOffer: plainTextFromInput(parsed.data.specialOffer ?? "", 500) || undefined,
      availabilityNote: plainTextFromInput(parsed.data.availabilityNote ?? "", 500) || undefined,
    },
    { providerId: base.providerId }
  );

  return { ok: true, data: { output, source } };
}

const campaignGenInput = z.object({
  title: z.string().min(1).max(200),
  campaignType: z.string().min(1).max(64),
  targetAudience: z.string().min(1).max(64),
  channel: z.enum(["email", "sms", "social"]),
  tone: z.enum(["warm", "professional", "casual"]),
  offerHint: z.string().max(1000).optional(),
});

export async function marketingGenerateCampaignCopy(
  csrfToken: string,
  raw: z.infer<typeof campaignGenInput>
): Promise<MarketingActionResult<{ output: MarketingGenerationOutput }>> {
  if (!(await assertCsrf(csrfToken))) return { ok: false, error: "Invalid security token." };
  const parsed = campaignGenInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const base = await loadMarketingContext();
  if (!base.ok) return { ok: false, error: base.error };

  const { output } = generateCampaignCopy({
    ctx: base.ctx,
    title: plainTextFromInput(parsed.data.title, 200),
    campaignType: plainTextFromInput(parsed.data.campaignType, 64),
    targetAudience: plainTextFromInput(parsed.data.targetAudience, 64),
    channel: parsed.data.channel,
    tone: parsed.data.tone,
    offerHint: plainTextFromInput(parsed.data.offerHint ?? "", 1000) || undefined,
  });

  return { ok: true, data: { output } };
}

const studioInput = z.object({
  serviceName: z.string().min(1).max(200),
  goal: z.enum(["repeat", "fill", "new", "offer"]),
  season: z.string().min(1).max(120),
  tone: z.enum(["warm", "professional", "casual"]),
  channel: z.enum(["email", "sms", "social"]),
});

export async function marketingGenerateStudio(
  csrfToken: string,
  raw: z.infer<typeof studioInput>
): Promise<MarketingActionResult<{ output: MarketingGenerationOutput }>> {
  if (!(await assertCsrf(csrfToken))) return { ok: false, error: "Invalid security token." };
  const parsed = studioInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const base = await loadMarketingContext();
  if (!base.ok) return { ok: false, error: base.error };

  const db = getDb();
  const [svcOk] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.providerId, base.providerId),
        eq(services.isActive, true),
        eq(services.name, parsed.data.serviceName)
      )
    )
    .limit(1);
  if (!svcOk) return { ok: false, error: "Service not found or inactive." };

  const { output } = generateStudioContent({
    ctx: base.ctx,
    serviceName: parsed.data.serviceName,
    goal: parsed.data.goal,
    season: plainTextFromInput(parsed.data.season, 120),
    tone: parsed.data.tone,
    channel: parsed.data.channel,
  });

  return { ok: true, data: { output } };
}

const saveDraftInput = z.object({
  source: z.enum(["reconnect", "studio", "campaign"]),
  title: z.string().min(1).max(300),
  primaryText: z.string().min(1).max(8000),
  alternatives: z.array(z.string().max(8000)).max(10),
  cta: z.string().max(200).optional(),
  imagePrompt: z.string().max(4000).optional(),
  channel: z.string().max(32).optional(),
  context: z.record(z.unknown()).optional(),
});

export async function marketingSaveContentDraft(
  csrfToken: string,
  raw: z.infer<typeof saveDraftInput>
): Promise<MarketingActionResult<{ id: string }>> {
  if (!(await assertCsrf(csrfToken))) return { ok: false, error: "Invalid security token." };
  const parsed = saveDraftInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const base = await loadMarketingContext();
  if (!base.ok) return { ok: false, error: base.error };

  const db = getDb();
  const [row] = await db
    .insert(marketingSavedContents)
    .values({
      providerId: base.providerId,
      source: parsed.data.source,
      title: plainTextFromInput(parsed.data.title, 300),
      primaryText: plainTextFromInput(parsed.data.primaryText, 8000),
      alternatives: parsed.data.alternatives.map((t) => plainTextFromInput(t, 8000)),
      cta: parsed.data.cta ? plainTextFromInput(parsed.data.cta, 200) : null,
      imagePrompt: parsed.data.imagePrompt ? plainTextFromInput(parsed.data.imagePrompt, 4000) : null,
      channel: parsed.data.channel ? plainTextFromInput(parsed.data.channel, 32) : null,
      context: parsed.data.context ?? null,
    })
    .returning({ id: marketingSavedContents.id });

  if (!row) return { ok: false, error: "Could not save." };
  revalidatePath("/dashboard/marketing");
  return { ok: true, data: { id: row.id } };
}

const createCampaignInput = z.object({
  title: z.string().min(1).max(200),
  campaignType: z.string().min(1).max(64),
  targetAudience: z.string().min(1).max(64),
  channel: z.enum(["email", "sms", "social"]),
  sendTiming: z.enum(["now", "scheduled"]),
  scheduledAt: z.string().optional(),
  messageBody: z.string().max(16000).optional(),
});

export async function marketingCreateCampaign(
  csrfToken: string,
  raw: z.infer<typeof createCampaignInput>
): Promise<MarketingActionResult<{ id: string }>> {
  if (!(await assertCsrf(csrfToken))) return { ok: false, error: "Invalid security token." };
  const parsed = createCampaignInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const base = await loadMarketingContext();
  if (!base.ok) return { ok: false, error: base.error };

  let scheduledAt: Date | null = null;
  if (parsed.data.sendTiming === "scheduled") {
    const rawDate = parsed.data.scheduledAt?.trim();
    if (!rawDate) return { ok: false, error: "Pick a date and time to schedule." };
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid schedule time." };
    scheduledAt = d;
  }

  const db = getDb();
  const [row] = await db
    .insert(marketingCampaigns)
    .values({
      providerId: base.providerId,
      title: plainTextFromInput(parsed.data.title, 200),
      campaignType: plainTextFromInput(parsed.data.campaignType, 64),
      targetAudience: plainTextFromInput(parsed.data.targetAudience, 64),
      channel: parsed.data.channel,
      sendTiming: parsed.data.sendTiming,
      scheduledAt,
      messageBody: plainTextFromInput(parsed.data.messageBody ?? "", 16000),
      status: "draft",
    })
    .returning({ id: marketingCampaigns.id });

  if (!row) return { ok: false, error: "Could not create campaign." };
  revalidatePath("/dashboard/marketing");
  return { ok: true, data: { id: row.id } };
}
