import Image from "next/image";

/**
 * Hero backdrop: full-width map field + paper wash + light topo accents.
 * Left scrim keeps headline copy readable while the map spans the section.
 */
export function HeroGroveBackdrop() {
  return (
    <div className="hero-grove-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Base wash */}
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--hl-accent)_10%,transparent)] opacity-[0.35] sm:opacity-[0.42]" />

      {/* Map — focal point shifted right so the left column sits over calmer, less busy map */}
      <Image
        src="/brand/hsl-map-banner.svg"
        alt=""
        width={1400}
        height={600}
        priority
        unoptimized
        className="absolute inset-0 h-full w-full min-h-[280px] object-cover object-[72%_42%] opacity-[0.92] sm:object-[68%_40%] md:object-[66%_38%] lg:object-[62%_36%] xl:object-[58%_34%]"
      />

      {/* Soft paper wash — strongest at far left, tapers into the map (dims artwork behind headline) */}
      <div
        className="absolute inset-y-0 left-0 z-[1] w-[min(92vw,580px)] bg-gradient-to-r from-[var(--hl-paper)] from-[2%] via-[color-mix(in_oklab,var(--hl-paper)_88%,transparent)] via-[42%] to-transparent sm:w-[min(88vw,600px)] sm:via-[38%] lg:w-[min(52%,620px)] lg:via-[36%] xl:via-[34%]"
        style={{ opacity: 0.97 }}
      />

      {/* Crisp reading band — extra paper density behind the heading block only */}
      <div
        className="absolute inset-y-0 left-0 z-[1] w-[min(85vw,480px)] max-w-[95%] bg-[var(--hl-paper)] sm:max-w-[90%] sm:w-[min(82vw,500px)] lg:w-[min(44vw,440px)]"
        style={{
          maskImage: "linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.75) 52%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.75) 52%, transparent 88%)",
          opacity: 0.55,
        }}
      />

      {/* Topo / parcel lines — subtle texture over the map */}
      <svg
        className="hero-grove-blob hero-grove-blob--1 absolute -left-[5%] top-[6%] z-[2] h-[min(320px,88vw)] w-[min(380px,95vw)] opacity-[0.05] sm:left-0 sm:h-[380px] sm:w-[440px] sm:opacity-[0.06]"
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M48 72c32-18 72-22 108-8 28 12 52 36 84 44 40 10 84-6 120-28 32-20 68-28 104-20"
          stroke="currentColor"
          strokeWidth={1.15}
          className="text-[var(--hl-ink)]"
        />
        <path
          d="M32 160c40-8 80-4 118 12 48 20 100 24 152 8 44-12 88-8 128 16"
          stroke="currentColor"
          strokeWidth={0.9}
          className="text-[var(--hl-ink)]"
          opacity={0.65}
        />
        <path
          d="M56 248c36 10 76 8 112-6 38-16 80-20 122-10 36 8 74 4 108-14"
          stroke="currentColor"
          strokeWidth={0.85}
          className="text-[var(--hl-ink)]"
          opacity={0.5}
        />
        <path d="M120 40v280M200 28v292M280 36v276" stroke="currentColor" strokeWidth={0.5} className="text-[var(--hl-ink)]" opacity={0.35} />
      </svg>

      <svg
        className="hero-grove-blob hero-grove-blob--2 absolute -right-[8%] bottom-[4%] z-[2] h-[min(260px,78vw)] w-[min(300px,88vw)] opacity-[0.04] sm:right-0 sm:bottom-[6%] sm:h-[300px] sm:w-[360px] sm:opacity-[0.05]"
        viewBox="0 0 360 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="180" cy="160" rx="140" ry="120" stroke="currentColor" strokeWidth={1} className="text-[var(--hl-ink)]" opacity={0.4} />
        <path
          d="M60 200c48-24 104-32 160-20 40 8 78 28 118 34"
          stroke="currentColor"
          strokeWidth={0.9}
          className="text-[var(--hl-ink)]"
          opacity={0.55}
        />
        <path
          d="M100 96c28 18 60 28 96 28 52 0 100-24 140-56"
          stroke="currentColor"
          strokeWidth={0.75}
          className="text-[var(--hl-ink)]"
          opacity={0.45}
        />
      </svg>

      <div className="hero-grove-blob hero-grove-blob--3 absolute bottom-[-6%] left-[18%] z-[2] h-[min(200px,55vw)] w-[min(280px,75vw)] rounded-[52%_48%_44%_56%] bg-[color-mix(in_oklab,var(--hl-accent)_22%,var(--surface-muted))] opacity-[0.08] blur-[48px] sm:opacity-[0.1] sm:blur-[64px]" />
      <div className="hero-grove-blob hero-grove-blob--4 absolute right-[12%] top-[18%] z-[2] h-[min(160px,48vw)] w-[min(220px,62vw)] rounded-[48%_52%_58%_42%] bg-[color-mix(in_oklab,#d8d0c4_65%,var(--hl-accent)_35%)] opacity-[0.06] blur-[40px] sm:opacity-[0.08] sm:blur-[56px]" />
    </div>
  );
}
