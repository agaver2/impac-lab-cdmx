import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const keys = [
    "ANTHROPIC_API_KEY",
    "GOOGLE_PLACES_API_KEY",
    "INEGI_TOKEN",
    "TAVILY_API_KEY",
  ];
  const report: Record<string, { present: boolean; length: number }> = {};
  for (const k of keys) {
    const v = process.env[k];
    report[k] = {
      present: !!v,
      length: v?.length ?? 0,
    };
  }
  return NextResponse.json(report);
}
