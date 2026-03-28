"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { asFormAction } from "@/lib/form-action";
import { sendMarketingToCustomers } from "@/actions/customers";
import {
  marketingCreateCampaign,
  marketingGenerateCampaignCopy,
  marketingGenerateStudio,
  marketingSaveContentDraft,
} from "@/actions/marketing";
import { CsrfField } from "@/components/csrf-field";
import { MarketingAiOutput } from "@/components/marketing/marketing-ai-output";
import { ReconnectDraftPanel, type ReconnectCustomerLite } from "@/components/marketing/reconnect-draft-panel";
import type { MarketingGenerationOutput } from "@/lib/marketing/types";

export type MarketingCustomerRow = {
  id: string;
  fullName: string;
  lastBookingAt: string | null;
  bookingCount: number;
};

export type MarketingServiceOption = { id: string; name: string };

export type MarketingCampaignRow = {
  id: string;
  title: string;
  campaignType: string;
  targetAudience: string;
  channel: string;
  sendTiming: string;
  scheduledAt: string | null;
  messageBody: string;
  createdAt: string;
};

export type MarketingSavedRow = {
  id: string;
  source: string;
  title: string;
  primaryText: string;
  alternatives: string[];
  cta: string | null;
  imagePrompt: string | null;
  channel: string | null;
  createdAt: string;
};

type TemplateOpt = { id: string; name: string };

type Props = {
  csrf: string;
  timezone: string;
  customers: MarketingCustomerRow[];
  services: MarketingServiceOption[];
  campaigns: MarketingCampaignRow[];
  savedContents: MarketingSavedRow[];
  templates: TemplateOpt[];
};

function formatDate(iso: string | null, tz: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
  } catch {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
}

function SectionHeader({ id, title, subtitle }: { id?: string; title: string; subtitle: string }) {
  return (
    <header className="mb-5">
      <h2 id={id} className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
        {subtitle}
      </p>
    </header>
  );
}

export function MarketingWorkspace({ csrf, timezone, customers, services, campaigns, savedContents, templates }: Props) {
  const router = useRouter();
  const [draftCustomer, setDraftCustomer] = useState<ReconnectCustomerLite | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cType, setCType] = useState("promotion");
  const [cAudience, setCAudience] = useState("all_customers");
  const [cChannel, setCChannel] = useState<"email" | "sms" | "social">("email");
  const [cTiming, setCTiming] = useState<"now" | "scheduled">("now");
  const [cScheduled, setCScheduled] = useState("");
  const [cBody, setCBody] = useState("");
  const [cOfferHint, setCOfferHint] = useState("");
  const [cTone, setCTone] = useState<"warm" | "professional" | "casual">("warm");
  const [cGen, setCGen] = useState<MarketingGenerationOutput | null>(null);
  const [cMsg, setCMsg] = useState<string | null>(null);
  const [cErr, setCErr] = useState<string | null>(null);

  const [svcName, setSvcName] = useState(services[0]?.name ?? "");
  const [goal, setGoal] = useState<"repeat" | "fill" | "new" | "offer">("repeat");
  const [seasonPreset, setSeasonPreset] = useState("This week");
  const [seasonDetail, setSeasonDetail] = useState("");
  const [sTone, setSTone] = useState<"warm" | "professional" | "casual">("warm");
  const [sChannel, setSChannel] = useState<"email" | "sms" | "social">("social");
  const [sOut, setSOut] = useState<MarketingGenerationOutput | null>(null);
  const [sBanner, setSBanner] = useState<string | null>(null);
  const [sErr, setSErr] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const sortedCustomers = useMemo(() => {
    const list = [...customers];
    list.sort((a, b) => {
      const ta = a.lastBookingAt ? new Date(a.lastBookingAt).getTime() : 0;
      const tb = b.lastBookingAt ? new Date(b.lastBookingAt).getTime() : 0;
      if (!a.lastBookingAt && !b.lastBookingAt) return a.fullName.localeCompare(b.fullName);
      if (!a.lastBookingAt) return -1;
      if (!b.lastBookingAt) return 1;
      return ta - tb;
    });
    return list;
  }, [customers]);

  const audienceLabel = (key: string) => {
    if (key === "recent_customers") return "Recent customers";
    if (key === "existing_customers") return "Existing customers";
    return "All customers";
  };

  const openDraft = (c: ReconnectCustomerLite) => {
    setDraftCustomer(c);
    setPanelOpen(true);
  };

  const runCampaignGen = () => {
    setCErr(null);
    setCMsg(null);
    startTransition(async () => {
      const res = await marketingGenerateCampaignCopy(csrf, {
        title: cTitle.trim() || "Campaign",
        campaignType: cType,
        targetAudience: audienceLabel(cAudience),
        channel: cChannel,
        tone: "warm",
        offerHint: cOfferHint.trim() || undefined,
      });
      if (!res.ok) {
        setCErr(res.error);
        return;
      }
      setCGen(res.data.output);
      setCBody(res.data.output.primary_text);
      setCMsg("Generated — edit below before saving.");
    });
  };

  const saveCampaign = () => {
    setCErr(null);
    setCMsg(null);
    startTransition(async () => {
      const res = await marketingCreateCampaign(csrf, {
        title: cTitle.trim() || "Untitled campaign",
        campaignType: cType,
        targetAudience: cAudience,
        channel: cChannel,
        sendTiming: cTiming,
        scheduledAt: cTiming === "scheduled" ? cScheduled : undefined,
        messageBody: cBody,
      });
      if (!res.ok) {
        setCErr(res.error);
        return;
      }
      setCMsg("Campaign saved.");
      setShowCampaignForm(false);
      setCTitle("");
      setCBody("");
      setCGen(null);
      setCOfferHint("");
      setCScheduled("");
      router.refresh();
    });
  };

  const runStudio = () => {
    setSErr(null);
    setSBanner(null);
    if (!svcName.trim()) {
      setSErr("Pick a service.");
      return;
    }
    const seasonLine = seasonDetail.trim() || seasonPreset;
    startTransition(async () => {
      const res = await marketingGenerateStudio(csrf, {
        serviceName: svcName.trim(),
        goal,
        season: seasonLine,
        tone: sTone,
        channel: sChannel,
      });
      if (!res.ok) {
        setSErr(res.error);
        return;
      }
      setSOut(res.data.output);
    });
  };

  const saveStudio = useCallback(async () => {
    if (!sOut) return;
    setSErr(null);
    setSBanner(null);
    const res = await marketingSaveContentDraft(csrf, {
      source: "studio",
      title: sOut.title,
      primaryText: sOut.primary_text,
      alternatives: sOut.alternatives,
      cta: sOut.cta,
      imagePrompt: sOut.image_prompt,
      channel: sOut.channel,
      context: { goal, season: seasonDetail.trim() || seasonPreset, service: svcName },
    });
    if (!res.ok) {
      setSErr(res.error);
      return;
    }
    setSBanner("Saved to your library.");
    router.refresh();
  }, [csrf, sOut, goal, seasonPreset, seasonDetail, svcName, router]);

  const copySavedPrimary = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
          Simple things you can do right now to get more bookings — follow up, plan a note, and draft content you can
          paste wherever you talk to clients.
        </p>
      </header>

      {/* —— Reconnect —— */}
      <section className="ui-card p-5 sm:p-6" aria-labelledby="reconnect-heading">
        <SectionHeader
          id="reconnect-heading"
          title="Reconnect with customers"
          subtitle="Reach out to people who already know your work."
        />
        {sortedCustomers.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
            You don&apos;t have any customers to reconnect with yet.
          </p>
        ) : (
          <ul className="grid gap-3">
            {sortedCustomers.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--foreground)]">{c.fullName}</p>
                  <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
                    Last booking: {formatDate(c.lastBookingAt, timezone)}
                    <span className="text-[color-mix(in_oklab,var(--muted-foreground)_85%,transparent)]"> · </span>
                    {c.bookingCount} booking{c.bookingCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  className="ui-btn-primary h-11 shrink-0 px-4 text-sm font-semibold sm:self-center"
                  onClick={() => openDraft({ id: c.id, fullName: c.fullName })}
                >
                  Draft message
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* —— Campaigns —— */}
      <section className="ui-card p-5 sm:p-6" aria-labelledby="campaigns-heading">
        <SectionHeader
          id="campaigns-heading"
          title="Campaigns"
          subtitle="Create simple promotions and schedule them when needed."
        />

        {campaigns.length > 0 ? (
          <ul className="mb-6 grid gap-3">
            {campaigns.map((camp) => (
              <li
                key={camp.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
              >
                <p className="font-semibold text-[var(--foreground)]">{camp.title}</p>
                <p className="mt-1 text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]">
                  {camp.campaignType.replace(/_/g, " ")} · {camp.channel} · {audienceLabel(camp.targetAudience)} ·{" "}
                  {camp.sendTiming === "scheduled" && camp.scheduledAt
                    ? `Scheduled ${formatDate(camp.scheduledAt, timezone)}`
                    : "Send when you are ready"}
                </p>
                {camp.messageBody ? (
                  <p className="mt-2 line-clamp-2 text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">{camp.messageBody}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-6 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">No campaigns yet.</p>
        )}

        {!showCampaignForm ? (
          <button type="button" className="ui-btn-primary min-h-11 px-5 text-sm font-semibold" onClick={() => setShowCampaignForm(true)}>
            Create campaign
          </button>
        ) : (
          <div className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5">
            {cErr ? (
              <div
                role="alert"
                className="rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
              >
                {cErr}
              </div>
            ) : null}
            {cMsg ? (
              <div className="rounded-lg border border-[color-mix(in_oklab,var(--success)_32%,var(--border))] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
                {cMsg}
              </div>
            ) : null}

            <label className="ui-field">
              <span className="ui-label">Campaign title</span>
              <input className="ui-input h-11" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="e.g. Spring tune-up reminder" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ui-field">
                <span className="ui-label">Type</span>
                <select className="ui-input h-11 text-base" value={cType} onChange={(e) => setCType(e.target.value)}>
                  <option value="promotion">Promotion</option>
                  <option value="reminder">Reminder</option>
                  <option value="last_minute_opening">Last-minute opening</option>
                  <option value="seasonal_post">Seasonal post</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Target audience</span>
                <select className="ui-input h-11 text-base" value={cAudience} onChange={(e) => setCAudience(e.target.value)}>
                  <option value="all_customers">All customers</option>
                  <option value="recent_customers">Recent customers</option>
                  <option value="existing_customers">Existing customers</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ui-field">
                <span className="ui-label">Channel</span>
                <select
                  className="ui-input h-11 text-base"
                  value={cChannel}
                  onChange={(e) => setCChannel(e.target.value as typeof cChannel)}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="social">Social post</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Send timing</span>
                <select
                  className="ui-input h-11 text-base"
                  value={cTiming}
                  onChange={(e) => setCTiming(e.target.value as typeof cTiming)}
                >
                  <option value="now">Send now</option>
                  <option value="scheduled">Schedule later</option>
                </select>
              </div>
            </div>

            {cTiming === "scheduled" ? (
              <label className="ui-field">
                <span className="ui-label">Scheduled date and time</span>
                <input
                  type="datetime-local"
                  className="ui-input h-11"
                  value={cScheduled}
                  onChange={(e) => setCScheduled(e.target.value)}
                />
              </label>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="ui-field sm:col-span-2">
                <span className="ui-label">Hints for AI (optional)</span>
                <input
                  className="ui-input h-11"
                  value={cOfferHint}
                  onChange={(e) => setCOfferHint(e.target.value)}
                  placeholder="e.g. 10% off first April booking"
                />
              </label>
              <div className="ui-field">
                <span className="ui-label">Tone</span>
                <select className="ui-input h-11 text-base" value={cTone} onChange={(e) => setCTone(e.target.value as typeof cTone)}>
                  <option value="warm">Warm</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="ui-btn-secondary min-h-11 px-4 text-sm" disabled={pending} onClick={runCampaignGen}>
                Generate with AI
              </button>
            </div>

            <label className="ui-field">
              <span className="ui-label">Message</span>
              <textarea
                className="ui-textarea min-h-[8rem] text-base"
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                placeholder="Write or paste your message, or generate a starting point above."
              />
            </label>

            {cGen ? (
              <details className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                <summary className="cursor-pointer font-medium text-[var(--foreground)]">Alternatives from last generation</summary>
                <ul className="mt-2 grid gap-2 text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
                  {cGen.alternatives.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className="ui-btn-primary min-h-11 px-5 text-sm font-semibold" disabled={pending} onClick={saveCampaign}>
                Save campaign
              </button>
              <button
                type="button"
                className="ui-btn-secondary min-h-11 px-5 text-sm"
                onClick={() => {
                  setShowCampaignForm(false);
                  setCErr(null);
                  setCMsg(null);
                  setCGen(null);
                }}
              >
                Cancel
              </button>
            </div>
            <p className="ui-hint">
              Saving stores your plan in Grove. Delivery and scheduling integrations can be added later — for now, use
              your usual email or SMS tools when it is time to send.
            </p>
          </div>
        )}
      </section>

      {/* —— Content studio —— */}
      <section className="ui-card p-5 sm:p-6" aria-labelledby="studio-heading">
        <SectionHeader
          id="studio-heading"
          title="Create content"
          subtitle="Generate simple marketing content based on your services and timing."
        />

        {services.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center">
            <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]">
              Add a service first to generate tailored marketing content.
            </p>
            <Link href="/dashboard/services" className="ui-btn-primary mx-auto mt-4 inline-flex min-h-11 items-center px-5 text-sm font-semibold no-underline">
              Add a service
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ui-field sm:col-span-2">
                <span className="ui-label">Service</span>
                <select className="ui-input h-11 text-base" value={svcName} onChange={(e) => setSvcName(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Goal</span>
                <select className="ui-input h-11 text-base" value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}>
                  <option value="repeat">Get repeat bookings</option>
                  <option value="fill">Fill open availability</option>
                  <option value="new">Attract new customers</option>
                  <option value="offer">Promote a limited offer</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Season or occasion</span>
                <select
                  className="ui-input h-11 text-base"
                  value={seasonPreset}
                  onChange={(e) => setSeasonPreset(e.target.value)}
                >
                  <option value="This week">This week</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Fall">Fall</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Friday special">Friday special</option>
                </select>
              </div>
              <label className="ui-field sm:col-span-2">
                <span className="ui-label">Custom detail (optional)</span>
                <input
                  className="ui-input h-11"
                  value={seasonDetail}
                  onChange={(e) => setSeasonDetail(e.target.value)}
                  placeholder="Overrides the dropdown when filled — e.g. Mother&apos;s Day weekend"
                />
              </label>
              <div className="ui-field">
                <span className="ui-label">Tone</span>
                <select className="ui-input h-11 text-base" value={sTone} onChange={(e) => setSTone(e.target.value as typeof sTone)}>
                  <option value="warm">Warm</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Channel</span>
                <select
                  className="ui-input h-11 text-base"
                  value={sChannel}
                  onChange={(e) => setSChannel(e.target.value as typeof sChannel)}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="social">Social</option>
                </select>
              </div>
            </div>

            {sErr ? (
              <div
                role="alert"
                className="rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
              >
                {sErr}
              </div>
            ) : null}
            {sBanner ? (
              <div className="rounded-lg border border-[color-mix(in_oklab,var(--success)_32%,var(--border))] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
                {sBanner}
              </div>
            ) : null}

            <button type="button" className="ui-btn-primary w-full min-h-11 text-sm font-semibold sm:w-auto sm:px-6" disabled={pending} onClick={runStudio}>
              Generate
            </button>

            {sOut ? (
              <MarketingAiOutput
                output={sOut}
                busy={pending}
                onCopyPrimary={async () => {
                  try {
                    await navigator.clipboard.writeText(sOut.primary_text);
                    setSBanner("Copied text.");
                  } catch {
                    setSBanner("Could not copy.");
                  }
                }}
                onCopyImagePrompt={async () => {
                  try {
                    await navigator.clipboard.writeText(sOut.image_prompt);
                    setSBanner("Image prompt copied.");
                  } catch {
                    setSBanner("Could not copy.");
                  }
                }}
                onRegenerate={runStudio}
                onSave={saveStudio}
                saveLabel="Save"
              />
            ) : null}
          </div>
        )}
      </section>

      {/* —— Saved library —— */}
      {savedContents.length > 0 ? (
        <section className="ui-card p-5 sm:p-6" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="text-lg font-semibold tracking-tight">
            Saved copy
          </h2>
          <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">Reuse or copy something you saved earlier.</p>
          <ul className="mt-4 grid gap-3">
            {savedContents.map((s) => (
              <li key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">{s.title}</p>
                <p className="mt-2 line-clamp-3 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">{s.primaryText}</p>
                <button
                  type="button"
                  className="ui-btn-secondary mt-3 min-h-10 px-3 text-sm"
                  onClick={() => copySavedPrimary(s.primaryText)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* —— Legacy template email blast (optional) —— */}
      {templates.length > 0 ? (
        <details className="ui-card p-5 sm:p-6">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Send a template email to a segment</summary>
          <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
            Existing Grove flow: picks customers who have not opted out and sends your chosen template by email.
          </p>
          <form action={asFormAction(sendMarketingToCustomers)} className="mt-4 grid max-w-md gap-4">
            <CsrfField token={csrf} />
            <label className="ui-field">
              <span className="ui-label">Template</span>
              <select id="templateId" name="templateId" required className="ui-input h-11 text-base">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-label">Segment</span>
              <select id="segment" name="segment" className="ui-input h-11 text-base">
                <option value="all">All opted-in customers</option>
                <option value="recent">Recent (booked in last 30 days)</option>
                <option value="inactive">Inactive (no booking in 90 days)</option>
                <option value="repeat">Repeat (more than one booking)</option>
              </select>
            </label>
            <button type="submit" className="ui-btn-primary w-fit min-h-11 px-5 text-sm font-semibold">
              Send campaign
            </button>
          </form>
        </details>
      ) : null}

      <ReconnectDraftPanel
        open={panelOpen}
        customer={draftCustomer}
        csrf={csrf}
        onClose={() => setPanelOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
