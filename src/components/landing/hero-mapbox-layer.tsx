"use client";

import { useEffect, useRef } from "react";
// CSP build + explicit worker URL avoids blob/eval workers (fixes Next.js / strict CSP console errors).
import mapboxgl from "mapbox-gl/dist/mapbox-gl-csp";
import "mapbox-gl/dist/mapbox-gl.css";

/** Must match installed `mapbox-gl` (see node_modules/mapbox-gl/package.json). */
const MAPBOX_GL_VERSION = "3.21.0";

/** Production HSL style (override with NEXT_PUBLIC_MAPBOX_STYLE_URL). */
const DEFAULT_STYLE_URL = "mapbox://styles/handshakelocal/cmnovnto7006f01s008f91w65";

/** Matches the Studio preview framing for this style (northwestern NB). */
const DEFAULT_CENTER: [number, number] = [-67.60952, 46.44161];
const DEFAULT_ZOOM = 13.21;

function parseCenter(): [number, number] {
  const lng = Number(process.env.NEXT_PUBLIC_MAPBOX_CENTER_LNG);
  const lat = Number(process.env.NEXT_PUBLIC_MAPBOX_CENTER_LAT);
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return [lng, lat];
  }
  return DEFAULT_CENTER;
}

function parseZoom(): number {
  const z = Number(process.env.NEXT_PUBLIC_MAPBOX_ZOOM);
  return Number.isFinite(z) && z > 0 ? z : DEFAULT_ZOOM;
}

/**
 * Non-interactive Mapbox GL canvas for the marketing hero. Requires
 * NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (public token from Mapbox Studio).
 */
export function HeroMapboxLayer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    mapboxgl.workerUrl = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl-csp-worker.js`;

    const styleUrl =
      process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL?.trim() || DEFAULT_STYLE_URL;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: parseCenter(),
      zoom: parseZoom(),
      interactive: false,
      attributionControl: true,
    });

    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full min-h-[280px] opacity-[0.92] [&_.mapboxgl-ctrl-bottom-left]:pl-2 [&_.mapboxgl-ctrl-bottom-right]:pr-2"
    />
  );
}
