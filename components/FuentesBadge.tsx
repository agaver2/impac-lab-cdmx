"use client";

import { useState } from "react";

type Props = {
  confidence: {
    level: "alta" | "media" | "baja";
    sourcesAvailable: number;
    sourcesTotal: number;
    freshnessDays: number | null;
  };
  denueSource?: "live" | "fallback";
};

const LEVEL_COLOR: Record<string, string> = {
  alta: "#84CC16",
  media: "#22D3EE",
  baja: "#F59E0B",
};

export default function FuentesBadge({ confidence, denueSource }: Props) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[confidence.level];

  return (
    <div className="card-soft px-4 py-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Confianza
          </span>
          <span className="font-medium" style={{ color }}>
            {confidence.level}
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="text-zinc-400">
          {confidence.sourcesAvailable}/{confidence.sourcesTotal} fuentes
        </div>
        {confidence.freshnessDays !== null && (
          <>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="text-zinc-400">
              Frescura ~{confidence.freshnessDays}d
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-mono uppercase tracking-widest text-cyan-300 hover:text-cyan-200"
      >
        {open ? "Ocultar" : "Fuentes"}
      </button>
      {open && (
        <div className="absolute mt-2 card p-4 space-y-2 text-xs z-10 right-4 max-w-md">
          <div className="text-zinc-400 font-mono uppercase tracking-widest mb-2">
            Datos oficiales usados
          </div>
          <ul className="space-y-1.5 text-zinc-300">
            <li>
              <span className="text-cyan-300">FGJ</span> — Carpetas de
              investigación, CKAN CDMX (dataset `fgj-cdmx`)
            </li>
            <li>
              <span className="text-cyan-300">SIMAT</span> — Índice de calidad
              del aire por zona (CKAN CDMX)
            </li>
            <li>
              <span className="text-cyan-300">DENUE</span> — Unidades económicas
              INEGI {denueSource === "fallback" && "(caché pre-calculado)"}
            </li>
            <li>
              <span className="text-cyan-300">Tavily</span> — Señales de mercado
              inmobiliario (no-oficial)
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
