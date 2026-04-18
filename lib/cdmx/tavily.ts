import { cached } from "./cache";

export type MarketSnippet = {
  title: string;
  url: string;
  snippet: string;
};

export type MarketSignals = {
  liveListings: MarketSnippet[];
  commercialListings: MarketSnippet[];
};

async function tavilySearch(query: string, maxResults = 5): Promise<MarketSnippet[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  return cached<MarketSnippet[]>("tavily.search", { query, maxResults }, 3600, async () => {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!r.ok) return [];
    const body = (await r.json()) as {
      results?: { title: string; url: string; content: string }[];
    };
    return (body.results ?? []).map((x) => ({
      title: x.title,
      url: x.url,
      snippet: x.content?.slice(0, 280) ?? "",
    }));
  });
}

export async function marketSignals(
  colonia: string | undefined,
  alcaldia: string | undefined,
): Promise<MarketSignals> {
  const zone = colonia ?? alcaldia ?? "Ciudad de México";
  const [liveListings, commercialListings] = await Promise.all([
    tavilySearch(`departamento renta ${zone} CDMX precio`, 4),
    tavilySearch(`local comercial renta ${zone} CDMX`, 4),
  ]);
  return { liveListings, commercialListings };
}
