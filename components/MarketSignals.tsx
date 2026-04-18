"use client";

type Listing = { title: string; url: string; snippet: string };

type Props = {
  live: Listing[];
  commercial: Listing[];
  mode: "live" | "business";
};

function ListingRow({ l }: { l: Listing }) {
  let host = "";
  try {
    host = new URL(l.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
    >
      <div className="text-sm font-medium text-slate-800 line-clamp-1">
        {l.title}
      </div>
      <div className="text-xs text-slate-500 line-clamp-2 mt-1">
        {l.snippet}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-700 mt-1.5">
        {host}
      </div>
    </a>
  );
}

export default function MarketSignals({ live, commercial, mode }: Props) {
  const primary = mode === "live" ? live : commercial;
  const secondary = mode === "live" ? commercial : live;
  const primaryLabel =
    mode === "live" ? "Renta / venta cercana" : "Locales comerciales";
  const secondaryLabel =
    mode === "live" ? "Locales (contexto)" : "Renta (contexto)";

  if (primary.length === 0 && secondary.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
          Mercado · vía Tavily
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-600 font-semibold mb-2">
            {primaryLabel}
          </div>
          <div className="space-y-1">
            {primary.slice(0, 3).map((l, i) => (
              <ListingRow key={i} l={l} />
            ))}
          </div>
        </div>
        {secondary.length > 0 && (
          <div>
            <div className="text-xs text-slate-600 font-semibold mb-2">
              {secondaryLabel}
            </div>
            <div className="space-y-1">
              {secondary.slice(0, 3).map((l, i) => (
                <ListingRow key={i} l={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
