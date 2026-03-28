type Props = {
  bio: string;
};

export function ProviderAboutSection({ bio }: Props) {
  const text = bio.trim();
  if (!text) return null;

  return (
    <section className="mt-12 sm:mt-14" aria-labelledby="about-heading">
      <h2 id="about-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        About
      </h2>
      <div className="mt-3 rounded-2xl bg-[var(--card)] p-5 shadow-[0_12px_40px_-18px_rgba(28,27,25,0.14),0_4px_12px_-6px_rgba(28,27,25,0.06)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:mt-4 sm:p-6">
        <p className="text-base leading-relaxed text-[var(--foreground)] whitespace-pre-wrap break-words sm:text-[1.05rem] sm:leading-relaxed">
          {text}
        </p>
      </div>
    </section>
  );
}
