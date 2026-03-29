"use client";

import { useEffect, useRef, useState } from "react";

function serializeForm(form: HTMLFormElement | null): string {
  if (!form) return "";
  const parts: string[] = [];
  for (const el of Array.from(form.elements)) {
    if (
      !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
    ) {
      continue;
    }
    if (!el.name) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      parts.push(`${el.name}=${el.checked ? el.value || "on" : ""}`);
    } else {
      parts.push(`${el.name}=${el.value}`);
    }
  }
  return parts.sort().join("|");
}

export function ProfileShell({
  children,
  usernameLocked = false,
}: {
  children: React.ReactNode;
  /** When true, hide the sticky “Save username” control (username is read-only). */
  usernameLocked?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef<string | null>(null);

  useEffect(() => {
    const pf = document.getElementById("profile-form") as HTMLFormElement | null;
    const uf = document.getElementById("username-form") as HTMLFormElement | null;
    const snap = () => `${serializeForm(pf)}||${serializeForm(uf)}`;
    initialRef.current = snap();

    const onChange = () => {
      if (initialRef.current === null) return;
      setDirty(snap() !== initialRef.current);
    };

    pf?.addEventListener("input", onChange);
    pf?.addEventListener("change", onChange);
    uf?.addEventListener("input", onChange);
    uf?.addEventListener("change", onChange);

    return () => {
      pf?.removeEventListener("input", onChange);
      pf?.removeEventListener("change", onChange);
      uf?.removeEventListener("input", onChange);
      uf?.removeEventListener("change", onChange);
    };
  }, [usernameLocked]);

  return (
    <div className={dirty ? "pb-24" : "pb-8"}>
      {children}
      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--card-border)] bg-[color-mix(in_oklab,var(--card)_94%,transparent)] shadow-[0_-4px_20px_rgba(28,27,25,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--card)_88%,transparent)]">
          <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-[var(--muted)]">
              Save your changes to update your profile.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="submit" form="profile-form" className="ui-btn-primary min-h-11 px-5 text-sm">
                Save changes
              </button>
              {usernameLocked ? null : (
                <button type="submit" form="username-form" className="ui-btn-secondary min-h-11 px-5 text-sm">
                  Save username
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
