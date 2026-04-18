import { NextResponse } from "next/server";
import { resolveLocation, type ResolvedLocation } from "@/lib/cdmx/places";
import { computeZoneScore } from "@/lib/scoring/zone-score";
import { generateNarrative } from "@/lib/scoring/narrative";
import { marketSignals } from "@/lib/cdmx/tavily";
import { findDemoColony } from "@/lib/demo-cache";
import type { Mode } from "@/lib/scoring/rubric";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    query?: string;
    demoId?: string;
    mode?: Mode;
    includeMarket?: boolean;
  };

  const mode: Mode = body.mode === "business" ? "business" : "live";
  const includeMarket = body.includeMarket !== false;

  let location: ResolvedLocation;
  try {
    if (body.demoId) {
      const c = findDemoColony(body.demoId);
      if (!c) return NextResponse.json({ error: "unknown demoId" }, { status: 404 });
      location = c.location;
    } else if (body.query) {
      location = await resolveLocation(body.query);
    } else {
      return NextResponse.json({ error: "provide query or demoId" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const [score, market] = await Promise.all([
    computeZoneScore({
      lat: location.lat,
      lng: location.lng,
      alcaldia: location.alcaldia,
      colonia: location.colonia,
      mode,
      radiusM: 500,
    }),
    includeMarket
      ? marketSignals(location.colonia, location.alcaldia).catch(() => ({
          liveListings: [],
          commercialListings: [],
        }))
      : Promise.resolve({ liveListings: [], commercialListings: [] }),
  ]);

  const narrative = await generateNarrative({
    score,
    locationLabel: location.colonia ?? location.formattedAddress,
    market,
  });

  return NextResponse.json({
    location,
    score,
    market,
    narrative,
  });
}
