"use client";

import Image from "next/image";

/** Static hero map artwork (SVG banner). */
export function HeroGroveMapSlot() {
  return (
    <Image
      src="/brand/hsl-map-banner.svg"
      alt=""
      width={1400}
      height={600}
      priority
      unoptimized
      className="absolute inset-0 h-full w-full min-h-[280px] object-cover object-[72%_42%] opacity-[0.92] sm:object-[68%_40%] md:object-[66%_38%] lg:object-[62%_36%] xl:object-[58%_34%]"
    />
  );
}
