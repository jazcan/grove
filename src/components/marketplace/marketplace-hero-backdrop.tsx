import Image from "next/image";

/** Decorative map-style banner behind the marketplace hero; keeps copy readable on the left. */
export function MarketplaceHeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--background)]" />
      <Image
        src="/brand/hsl-marketplace-banner.svg"
        alt=""
        width={1200}
        height={300}
        priority
        unoptimized
        className="absolute inset-0 h-full w-full min-h-[200px] object-cover object-[58%_42%] opacity-[0.42] sm:min-h-[220px] sm:object-[55%_40%] sm:opacity-[0.48] lg:object-[52%_38%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[var(--background)] from-[8%] via-[color-mix(in_oklab,var(--background)_78%,transparent)] via-[45%] to-transparent to-[78%] sm:from-[6%] sm:via-[40%] sm:to-[72%]"
        style={{ opacity: 0.94 }}
      />
    </div>
  );
}
