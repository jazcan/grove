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
  const city = (searchParams.get("city") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();

  try {
    const rows = await searchDiscoverableProviders({ q, city, category, limit: 50 });
    return NextResponse.json({ results: rows });
  } catch (e) {
    // Demo-safe: don't fail the entire app if DB isn't configured.
    console.error("[api/marketplace/search] failed", e);
    return NextResponse.json(
      { results: [], error: "Marketplace search is temporarily unavailable." },
      { status: 503 }
    );
  }
}
