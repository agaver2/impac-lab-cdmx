import { NextResponse } from "next/server";
import { resolveLocation } from "@/lib/cdmx/places";
import { findDemoColony } from "@/lib/demo-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; demoId?: string };
  if (body.demoId) {
    const c = findDemoColony(body.demoId);
    if (c) return NextResponse.json({ resolved: c.location });
    return NextResponse.json({ error: "unknown demoId" }, { status: 404 });
  }
  if (!body.query) {
    return NextResponse.json({ error: "missing query" }, { status: 400 });
  }
  try {
    const resolved = await resolveLocation(body.query);
    return NextResponse.json({ resolved });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
