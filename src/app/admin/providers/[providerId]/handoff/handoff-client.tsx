"use client";

import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  saveHandoffTargetEmail,
  saveHandoffInternalNotes,
  triggerSeededHandoff,
  resendSeededHandoffInvite,
  type HandoffActionState,
} from "@/actions/admin-seeded-providers";
import { CsrfField } from "@/components/csrf-field";

type Detail = {
  providerId: string;
  username: string;
  displayName: string;
  businessName: string | null;
  loginEmail: string;
  handoffTargetEmail: string | null;
  handoffStatus: "none" | "seeded" | "invited" | "claimed";
  handoffSentAt: string | null;
  claimedAt: string | null;
  internalAdminNotes: string | null;
};

type Props = {
  csrfToken: string;
  appBaseUrl: string;
  detail: Detail;
};

export function HandoffClient({ csrfToken, appBaseUrl, detail }: Props) {
  const [saveTargetState, saveTargetAction, saveTargetPending] = useActionState(saveHandoffTargetEmail, undefined);
  const [notesState, notesAction, notesPending] = useActionState(saveHandoffInternalNotes, undefined);
  const [triggerState, triggerAction, triggerPending] = useActionState(triggerSeededHandoff, undefined as HandoffActionState | undefined);
  const [resendState, resendAction, resendPending] = useActionState(
    resendSeededHandoffInvite,
    undefined as HandoffActionState | undefined
  );

  const claimLinkRef = useRef<string | null>(null);
  const lastClaim =
    triggerState && "claimLink" in triggerState && triggerState.claimLink
      ? triggerState.claimLink
      : resendState && "claimLink" in resendState && resendState.claimLink
        ? resendState.claimLink
        : null;

  useEffect(() => {
    if (lastClaim) claimLinkRef.current = lastClaim;
  }, [lastClaim]);

  const publicUrl = `${appBaseUrl.replace(/\/$/, "")}/${detail.username}`;

  const statusLabel =
    detail.handoffStatus === "seeded"
      ? "Seeded"
      : detail.handoffStatus === "invited"
        ? "Invited"
        : detail.handoffStatus === "claimed"
          ? "Claimed"
          : detail.handoffStatus;

  const canEditTarget = detail.handoffStatus === "seeded";
  const canTrigger = detail.handoffStatus === "seeded";
  const canResend = detail.handoffStatus === "invited";

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">Account</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Status</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Current login email</dt>
            <dd className="font-mono text-xs">{detail.loginEmail}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Display / business</dt>
            <dd>
              {detail.displayName}
              {detail.businessName ? ` — ${detail.businessName}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Public profile</dt>
            <dd>
              <a href={publicUrl} className="text-[var(--accent)] underline-offset-2 hover:underline">
                {publicUrl}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {canEditTarget ? (
        <form action={saveTargetAction} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
          <CsrfField token={csrfToken} />
          <input type="hidden" name="providerId" value={detail.providerId} />
          <h2 className="text-base font-semibold">Real provider email</h2>
          <div className="ui-field">
            <label htmlFor="handoffEmail" className="ui-label">
              Real provider email
            </label>
            <input
              id="handoffEmail"
              name="handoffEmail"
              type="email"
              required
              defaultValue={detail.handoffTargetEmail ?? ""}
              className="ui-input"
              autoComplete="off"
            />
            <p className="ui-hint">Save before sending handoff. Must not belong to another account.</p>
          </div>
          {saveTargetState?.error ? <div className="ui-alert-error">{saveTargetState.error}</div> : null}
          {saveTargetState?.success ? <div className="ui-alert-success">{saveTargetState.success}</div> : null}
          <button type="submit" disabled={saveTargetPending} className="ui-btn-secondary min-h-10 px-4 py-2 text-sm">
            {saveTargetPending ? "Saving…" : "Save handoff target"}
          </button>
        </form>
      ) : (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-sm shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold">Real provider email</h2>
          <p className="mt-2 text-[var(--muted)]">
            {detail.handoffStatus === "claimed"
              ? "Handoff is complete. Login email is owned by the provider."
              : "Target was applied when handoff was sent. Use resend if they need a new link."}
          </p>
        </section>
      )}

      <form action={notesAction} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <CsrfField token={csrfToken} />
        <input type="hidden" name="providerId" value={detail.providerId} />
        <h2 className="text-base font-semibold">Internal notes</h2>
        <textarea
          name="internalAdminNotes"
          rows={3}
          defaultValue={detail.internalAdminNotes ?? ""}
          className="ui-input min-h-[5rem]"
        />
        {notesState?.error ? <div className="ui-alert-error">{notesState.error}</div> : null}
        {notesState?.success ? <div className="ui-alert-success">{notesState.success}</div> : null}
        <button type="submit" disabled={notesPending} className="ui-btn-secondary min-h-10 px-4 py-2 text-sm">
          {notesPending ? "Saving…" : "Save internal notes"}
        </button>
      </form>

      {detail.handoffStatus !== "claimed" ? (
        <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold">Send handoff</h2>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_75%,transparent)]">
            Updates the login email to the saved real provider email, then sends a password link (same flow as forgot
            password). The provider sets their password on the standard reset page.
          </p>
          {canTrigger ? (
            <form action={triggerAction} className="space-y-3">
              <CsrfField token={csrfToken} />
              <input type="hidden" name="providerId" value={detail.providerId} />
              <button type="submit" disabled={triggerPending} className="ui-btn-primary min-h-10 px-4 py-2 text-sm">
                {triggerPending ? "Sending…" : "Send handoff"}
              </button>
            </form>
          ) : null}
          {canResend ? (
            <form action={resendAction} className="space-y-3">
              <CsrfField token={csrfToken} />
              <input type="hidden" name="providerId" value={detail.providerId} />
              <button type="submit" disabled={resendPending} className="ui-btn-secondary min-h-10 px-4 py-2 text-sm">
                {resendPending ? "Sending…" : "Resend invite"}
              </button>
            </form>
          ) : null}
          {triggerState?.error ? <div className="ui-alert-error">{triggerState.error}</div> : null}
          {resendState?.error ? <div className="ui-alert-error">{resendState.error}</div> : null}
          {triggerState?.success ?? resendState?.success ? (
            <div className="ui-alert-success space-y-2">
              <p>{triggerState?.success ?? resendState?.success}</p>
              {(triggerState?.claimLink || resendState?.claimLink || claimLinkRef.current) ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Copy claim link</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      readOnly
                      className="ui-input flex-1 font-mono text-xs"
                      value={lastClaim ?? claimLinkRef.current ?? ""}
                    />
                    <button
                      type="button"
                      className="ui-btn-secondary px-3 py-2 text-sm"
                      onClick={() => {
                        const v = lastClaim ?? claimLinkRef.current;
                        if (v) void navigator.clipboard.writeText(v);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-sm">
        <Link href="/admin/providers/seeded" className="text-[var(--accent)] underline-offset-2 hover:underline">
          ← Seeded accounts list
        </Link>
      </p>
    </div>
  );
}
