"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { sendQuickMarketingMessage } from "@/actions/customers";

export type QuickSendCustomerOption = { id: string; fullName: string };

type Props = {
  open: boolean;
  csrf: string;
  customers: QuickSendCustomerOption[];
  onClose: () => void;
};

export function QuickSendMessageModal({ open, csrf, customers, onClose }: Props) {
  const router = useRouter();
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setRecipientMode("all");
    setSelected(new Set());
    setFilter("");
    setSubject("");
    setBody("");
    setBanner(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredCustomers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.fullName.toLowerCase().includes(q));
  }, [customers, filter]);

  const toggleId = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const send = useCallback(() => {
    setError(null);
    setBanner(null);
    startTransition(async () => {
      const res = await sendQuickMarketingMessage(csrf, {
        subject,
        body,
        recipientMode,
        customerIds: recipientMode === "selected" ? Array.from(selected) : [],
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBanner(`Sent ${res.sent} of ${res.attempted} messages.`);
      router.refresh();
    });
  }, [csrf, subject, body, recipientMode, selected, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-send-title"
    >
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(92vh,36rem)] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_64px_-24px_rgba(28,27,25,0.35)] sm:max-h-[min(90vh,34rem)] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="quick-send-title" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Send message
            </h2>
            <p className="mt-1 text-sm text-[color-mix(in_oklab,var(--foreground)_62%,transparent)]">
              Email customers who have not opted out of marketing. Use your usual judgment on frequency.
            </p>
          </div>
          <button type="button" className="ui-btn-secondary shrink-0 px-3 py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {customers.length === 0 ? (
            <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,transparent)]">
              No opted-in customers with email yet. Add people from Customers or adjust marketing preferences on a
              profile.
            </p>
          ) : (
            <>
              {error ? (
                <div
                  role="alert"
                  className="mb-3 rounded-lg border border-[color-mix(in_oklab,var(--error)_35%,var(--border))] bg-[color-mix(in_oklab,var(--error)_8%,var(--card))] px-3 py-2 text-sm text-[var(--error)]"
                >
                  {error}
                </div>
              ) : null}
              {banner ? (
                <div className="mb-3 rounded-lg border border-[color-mix(in_oklab,var(--success)_32%,var(--border))] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
                  {banner}
                </div>
              ) : null}

              <fieldset className="mb-4 grid gap-2">
                <legend className="text-sm font-semibold text-[var(--foreground)]">Recipients</legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="recipients"
                    className="mt-1"
                    checked={recipientMode === "all"}
                    onChange={() => setRecipientMode("all")}
                  />
                  <span>All opted-in customers ({customers.length})</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="recipients"
                    className="mt-1"
                    checked={recipientMode === "selected"}
                    onChange={() => setRecipientMode("selected")}
                  />
                  <span>Choose specific customers</span>
                </label>
              </fieldset>

              {recipientMode === "selected" ? (
                <div className="mb-4">
                  <label className="ui-field">
                    <span className="ui-label text-xs">Find</span>
                    <input
                      className="ui-input h-10 text-sm"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter by name"
                    />
                  </label>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
                    {filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--card))]">
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleId(c.id)} />
                          <span className="truncate">{c.fullName}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <label className="ui-field mb-3">
                <span className="ui-label">Subject</span>
                <input
                  className="ui-input h-11 text-base"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. A quick note from the shop"
                />
              </label>
              <label className="ui-field mb-3">
                <span className="ui-label">Message</span>
                <textarea
                  className="ui-textarea min-h-[7rem] text-base"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email. You can use {{name}} for the customer’s first line."
                />
              </label>
              <p className="ui-hint mb-4">
                Messages send immediately through your email provider. Plain text; line breaks are preserved.
              </p>

              <button
                type="button"
                className="ui-btn-primary min-h-11 w-full text-sm font-semibold sm:w-auto sm:px-6"
                disabled={pending || customers.length === 0}
                onClick={send}
              >
                {pending ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
