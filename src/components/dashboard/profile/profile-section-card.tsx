import type { ReactNode } from "react";

type Status = "complete" | "incomplete" | "optional";

const statusLabel: Record<Status, string> = {
  complete: "Complete",
  incomplete: "Missing info",
  optional: "Optional",
};

export function ProfileSectionCard({
  id,
  title,
  description,
  status,
  subdued = false,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  status: Status;
  subdued?: boolean;
  children: ReactNode;
}) {
  const badgeMuted = status === "optional";
  const badgeWarn = status === "incomplete";

  return (
    <div
      id={id}
      className={[
        "scroll-mt-24 rounded-2xl bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:p-7",
        subdued ? "opacity-[0.97]" : "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 items-center self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
            badgeWarn
              ? "bg-[color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[var(--accent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_25%,transparent)]"
              : badgeMuted
                ? "bg-[var(--surface-muted)] text-[var(--muted)] ring-1 ring-[var(--card-border)]"
                : "bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-[var(--success-border)]",
          ].join(" ")}
        >
          {statusLabel[status]}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
