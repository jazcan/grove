"use client";

import { useCallback, useEffect, useState } from "react";
import { marketingGenerateReconnect, marketingSaveContentDraft } from "@/actions/marketing";
import type { MarketingGenerationOutput } from "@/lib/marketing/types";
import { MarketingAiOutput } from "@/components/marketing/marketing-ai-output";

export type ReconnectCustomerLite = { id: string; fullName: string };

type Props = {
  open: boolean;
  customer: ReconnectCustomerLite | null;
  csrf: string;
  onClose: () => void;
  onSaved?: () => void;
};

type MsgKind = "rebooking" | "last_minute_opening" | "general_follow_up";

export function ReconnectDraftPanel({ open, customer, csrf, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<MsgKind>("rebooking");
  const [tone, setTone] = useState<"warm" | "professional" | "casual">("warm");
  const [channel, setChannel] = useState<"email" | "sms" | "direct_message">("email");
  const [specialOffer, setSpecialOffer] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [output, setOutput] = useState<MarketingGenerationOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [genSource, setGenSource] = useState<"openai" | "mock" | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind("rebooking");
    setTone("warm");
    setChannel("email");
    setSpecialOffer("");
    setAvailabilityNote("");
    setOutput(null);
    setError(null);
    setBanner(null);
    setGenSource(null);
    setLoading(false);
    setSaving(false);
  }, [open, customer?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runGenerate = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    setBanner(null);
    const res = await marketingGenerateReconnect(csrf, {
      kind,
      customerId: customer.id,
      tone,
      channel,
      specialOffer: specialOffer.trim() || undefined,
      availabilityNote: availabilityNote.trim() || undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOutput(res.data.output);
    setGenSource(res.data.source);
  }, [csrf, customer, kind, tone, channel, specialOffer, availabilityNote]);

  const copyText = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.primary_text);
      setBanner("Copied to clipboard.");
    } catch {
      setBanner("Could not copy — select the text manually.");
    }
  }, [output]);

  const copyImage = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.image_prompt);
      setBanner("Image prompt copied.");
    } catch {
      setBanner("Could not copy image prompt.");
    }
  }, [output]);

  const saveDraft = useCallback(async () => {
    if (!output || !customer) return;
    setSaving(true);
    setBanner(null);
    const res = await marketingSaveContentDraft(csrf, {
      source: "reconnect",
      title: `${customer.fullName} — ${output.title}`,
      primaryText: output.primary_text,
      alternatives: output.alternatives,
      cta: output.cta,
      imagePrompt: output.image_prompt,
      channel: output.channel,
      context: { customerId: customer.id, kind },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBanner("Saved to your library below.");
    onSaved?.();
  }, [csrf, customer, output, kind, onSaved]);

  if (!open || !customer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconnect-draft-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(92vh,44rem)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] sm:max-h-[min(90vh,40rem)] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="reconnect-draft-title" className="text-lg font-semibold tracking-tight">
              Draft message
            </h2>
            <p className="mt-1 truncate text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">{customer.fullName}</p>
          </div>
          <button
            type="button"
            className="ui-btn-secondary shrink-0 px-3 py-2 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
            >
              {error}
            </div>
          ) : null}
          {banner ? (
            <div className="mb-4 rounded-lg border border-[color-mix(in_oklab,var(--success)_32%,var(--border))] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
              {banner}
            </div>
          ) : null}

          {!output ? (
            <div className="grid gap-4">
              <div className="ui-field">
                <span className="ui-label">Message type</span>
                <select className="ui-input h-11 text-base" value={kind} onChange={(e) => setKind(e.target.value as MsgKind)}>
                  <option value="rebooking">Rebooking</option>
                  <option value="last_minute_opening">Last-minute opening</option>
                  <option value="general_follow_up">General follow-up</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Tone</span>
                <select className="ui-input h-11 text-base" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
                  <option value="warm">Warm</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div className="ui-field">
                <span className="ui-label">Channel</span>
                <select
                  className="ui-input h-11 text-base"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as typeof channel)}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="direct_message">Direct message</option>
                </select>
              </div>
              {kind === "rebooking" ? (
                <>
                  <label className="ui-field">
                    <span className="ui-label">Special offer (optional)</span>
                    <input
                      className="ui-input h-11"
                      value={specialOffer}
                      onChange={(e) => setSpecialOffer(e.target.value)}
                      placeholder="Only if you have a real offer to mention"
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-label">Availability note (optional)</span>
                    <input
                      className="ui-input h-11"
                      value={availabilityNote}
                      onChange={(e) => setAvailabilityNote(e.target.value)}
                      placeholder="e.g. a few spots this week"
                    />
                  </label>
                </>
              ) : null}
              {kind === "last_minute_opening" ? (
                <label className="ui-field">
                  <span className="ui-label">When is it open?</span>
                  <input
                    className="ui-input h-11"
                    value={availabilityNote}
                    onChange={(e) => setAvailabilityNote(e.target.value)}
                    placeholder="e.g. Friday 2–5pm"
                    required
                  />
                </label>
              ) : null}

              <button type="button" className="ui-btn-primary min-h-12 w-full text-sm font-semibold" disabled={loading} onClick={runGenerate}>
                {loading ? "Generating…" : "Generate"}
              </button>
              <p className="ui-hint">
                Grove drafts copy for you to send yourself. Sending is not automated from here yet.
              </p>
            </div>
          ) : (
            <>
              {genSource === "openai" ? (
                <p className="mb-4 text-sm text-[color-mix(in_oklab,var(--foreground)_58%,transparent)]">Generated with AI — review before you send.</p>
              ) : null}
              <MarketingAiOutput
              output={output}
              busy={loading || saving}
              onCopyPrimary={copyText}
              onCopyImagePrompt={copyImage}
              onRegenerate={runGenerate}
              onSave={saveDraft}
              saveLabel="Save draft"
            />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
