/**
 * Decorative hero backdrop: soft blurred shapes + slow CSS drift.
 * Motion respects prefers-reduced-motion (see globals.css).
 */
export function HeroGroveBackdrop() {
  return (
    <div className="hero-grove-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Soft top veil — reads as light through canopy without fighting the headline */}
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--accent)_18%,transparent)] via-[color-mix(in_oklab,var(--accent)_6%,transparent)] to-transparent opacity-[0.55] sm:opacity-[0.65]" />

      <div className="hero-grove-blob hero-grove-blob--1 absolute -left-[18%] top-[-12%] h-[min(360px,78vw)] w-[min(420px,92vw)] rounded-[58%_42%_52%_48%] bg-[color-mix(in_oklab,var(--accent)_55%,#a8bea0)] opacity-[0.17] blur-[56px] sm:h-[420px] sm:w-[480px] sm:opacity-[0.20] sm:blur-[80px]" />
      <div className="hero-grove-blob hero-grove-blob--2 absolute -right-[12%] top-[8%] h-[min(300px,70vw)] w-[min(380px,85vw)] rounded-[45%_55%_48%_52%] bg-[color-mix(in_oklab,#dccfb8_55%,var(--accent)_45%)] opacity-[0.15] blur-[52px] sm:h-[360px] sm:w-[420px] sm:opacity-[0.18] sm:blur-[72px]" />
      <div className="hero-grove-blob hero-grove-blob--3 absolute bottom-[-8%] left-[12%] h-[min(280px,62vw)] w-[min(340px,78vw)] rounded-[52%_48%_44%_56%] bg-[color-mix(in_oklab,var(--accent)_48%,var(--surface-muted))] opacity-[0.14] blur-[58px] sm:bottom-[-5%] sm:h-[340px] sm:w-[400px] sm:opacity-[0.17] sm:blur-[76px]" />
      <div className="hero-grove-blob hero-grove-blob--4 absolute bottom-[10%] right-[-10%] h-[min(240px,56vw)] w-[min(320px,74vw)] rounded-[48%_52%_58%_42%] bg-[color-mix(in_oklab,#e8e2d6_70%,#6d9078_30%)] opacity-[0.11] blur-[48px] sm:bottom-[12%] sm:h-[300px] sm:w-[360px] sm:opacity-[0.15] sm:blur-[68px]" />
    </div>
  );
}
