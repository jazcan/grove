type Props = {
  websiteUrl: string | null | undefined;
  socialFacebookUrl: string | null | undefined;
  socialInstagramUrl: string | null | undefined;
  socialYoutubeUrl: string | null | undefined;
  socialTiktokUrl: string | null | undefined;
};

export function ProviderPublicLinks({
  websiteUrl,
  socialFacebookUrl,
  socialInstagramUrl,
  socialYoutubeUrl,
  socialTiktokUrl,
}: Props) {
  const web = websiteUrl?.trim();
  const fb = socialFacebookUrl?.trim();
  const ig = socialInstagramUrl?.trim();
  const yt = socialYoutubeUrl?.trim();
  const tt = socialTiktokUrl?.trim();
  const items = [
    web ? { href: web, label: "Website" } : null,
    fb ? { href: fb, label: "Facebook" } : null,
    ig ? { href: ig, label: "Instagram" } : null,
    yt ? { href: yt, label: "YouTube" } : null,
    tt ? { href: tt, label: "TikTok" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

  if (!items.length) return null;

  return (
    <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-full border border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] bg-[var(--background)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
