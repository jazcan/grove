"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

function HeroBackdropStaticMap() {
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

const HeroMapboxLayer = dynamic(
  () => import("./hero-mapbox-layer").then((m) => m.HeroMapboxLayer),
  { ssr: false, loading: () => <HeroBackdropStaticMap /> }
);

/** Mapbox hero when `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set; otherwise the static SVG map. */
export function HeroGroveMapSlot() {
  const useMapbox = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim());
  return useMapbox ? <HeroMapboxLayer /> : <HeroBackdropStaticMap />;
}
