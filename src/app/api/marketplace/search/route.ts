import { NextResponse } from "next/server";
import { searchDiscoverableProviders } from "@/lib/marketplace-search";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(clientKey(ip, "search"), 60, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const location = (searchParams.get("location") ?? searchParams.get("city") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const country = (searchParams.get("country") ?? "CA").trim();
  const radiusKm = searchParams.get("radiusKm") ?? undefined;

  try {
    const out = await searchDiscoverableProviders({
      q,
      location: location || undefined,
      city: searchParams.get("city") ?? undefined,
      category,
      country,
      radiusKm: radiusKm ?? undefined,
      limit: 50,
    });
    return NextResponse.json({
      results: out.results,
      geocodeFailed: out.geocodeFailed,
      searchCenter: out.searchCenter,
      radiusKmUsed: out.radiusKmUsed,
      usedLocationFilter: out.usedLocationFilter,
    });
  } catch (e) {
    // Demo-safe: don't fail the entire app if DB isn't configured.
    console.error("[api/marketplace/search] failed", e);
    return NextResponse.json(
      { results: [], error: "Marketplace search is temporarily unavailable." },
      { status: 503 }
    );
  }
}
