import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { fetchPresentedProviderSignals } from "@/domain/provider-dashboard-signals";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "provider" || !u.providerId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();
  const signals = await fetchPresentedProviderSignals(db, u.providerId);

  return NextResponse.json({ signals });
}

export const dynamic = "force-dynamic";
