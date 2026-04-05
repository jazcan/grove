"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CsrfField } from "@/components/csrf-field";
import { updateProviderProfileImageKey } from "@/actions/provider-profile";
import { publicProfileImageUrl } from "@/lib/public-profile-helpers";

type Props = {
  csrf: string;
  profileImageKey: string | null;
  displayName: string;
};

export function ProfileImageField({ csrf, profileImageKey, displayName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const url = publicProfileImageUrl(profileImageKey);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setError("");
    try {
      const presign = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      type PresignJson = {
        url?: string;
        key?: string;
        error?: string;
        code?: string;
        devUploadAvailable?: boolean;
      };
      let key: string | undefined;

      if (presign.status === 501) {
        const data = (await presign.json()) as PresignJson;
        if (data.devUploadAvailable) {
          const local = new FormData();
          local.set("file", file);
          const up = await fetch("/api/upload/profile", { method: "POST", body: local });
          const localData = (await up.json()) as { key?: string; error?: string };
          if (!up.ok || !localData.key) {
            setError(localData.error ?? data.error ?? "Upload is not available.");
            return;
          }
          key = localData.key;
        } else {
          setError(data.error ?? "Upload is not available. Configure object storage for profile photos.");
          return;
        }
      } else {
        const data = (await presign.json()) as PresignJson;
        if (!presign.ok || !data.url || !data.key) {
          setError(data.error ?? "Upload is not available. Check storage settings.");
          return;
        }
        const put = await fetch(data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!put.ok) {
          setError("Could not upload the image.");
          return;
        }
        key = data.key;
      }
      const fd = new FormData();
      fd.set("csrf", csrf);
      fd.set("profileImageKey", key);
      startTransition(async () => {
        const res = await updateProviderProfileImageKey(fd);
        if (res?.error) setError(res.error);
        else router.refresh();
      });
    } catch {
      setError("Something went wrong. Try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_8%,var(--border))] bg-[var(--card)] p-5 sm:p-6">
      <h3 className="text-base font-semibold text-[var(--foreground)]">Profile photo</h3>
      <p className="ui-hint mt-1">Square photos look best on your public page.</p>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic CDN URL
            <img src={url} alt="" className="h-full w-full object-cover" width={96} height={96} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-[var(--muted)]">
              No photo
            </div>
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={onFile} aria-label="Upload profile photo" />
          <button
            type="button"
            disabled={pending}
            className="ui-btn-secondary min-h-10 px-4 text-sm font-semibold"
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Saving…" : url ? "Change photo" : "Upload photo"}
          </button>
          <form className="hidden" aria-hidden>
            <CsrfField token={csrf} />
          </form>
          <p className="ui-hint mt-2 max-w-xs text-xs">Shown as {displayName}&apos;s picture on your public profile.</p>
        </div>
      </div>
      {error ? (
        <p className="ui-inline-validation mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
