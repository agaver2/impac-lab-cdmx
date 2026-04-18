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
  alta: "#15803D",  // green-700
  media: "#0E7490", // cyan-700
  baja: "#B45309",  // amber-700
};

type Source = {
  tag: string;
  name: string;
  url: string;
  note?: string;
};

const SOURCES: Source[] = [
  {
    tag: "FGJ",
    name: "Carpetas de investigación — Fiscalía CDMX",
    url: "https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico",
    note: "Agregado anual por alcaldía, 2024",
  },
  {
    tag: "SIMAT",
    name: "Índice de calidad del aire",
    url: "https://datos.cdmx.gob.mx/dataset/indice-de-calidad-del-aire",
    note: "Última lectura por zona (NO/NE/CE/SO/SE)",
  },
  {
    tag: "DENUE",
    name: "Unidades económicas — INEGI",
    url: "https://www.inegi.org.mx/servicios/denue_ws.aspx",
    note: "Radio 500m alrededor del punto consultado",
  },
  {
    tag: "Tavily",
    name: "Señales de mercado (listings)",
    url: "https://tavily.com",
    note: "No oficial — contexto de renta/oferta",
  },
];

export default function FuentesBadge({ confidence, denueSource }: Props) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[confidence.level];

  return (
    <div className="card-soft px-4 py-3 text-sm relative">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="size-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
            />
            <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Confianza
            </span>
            <span className="font-semibold capitalize" style={{ color }}>
              {confidence.level}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-slate-600">
            {confidence.sourcesAvailable}/{confidence.sourcesTotal} fuentes disponibles
          </div>
          {confidence.freshnessDays !== null && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-slate-600">
                Frescura ~{confidence.freshnessDays}d
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-mono uppercase tracking-widest text-cyan-700 hover:text-cyan-800"
        >
          {open ? "Ocultar" : "Ver fuentes"}
        </button>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
          <div className="text-slate-500 font-mono uppercase tracking-widest text-[11px] mb-2">
            Datos abiertos utilizados
          </div>
          <ul className="space-y-2 text-sm">
            {SOURCES.map((s) => (
              <li key={s.tag} className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-50 text-cyan-800 border border-cyan-100"
                >
                  {s.tag}
                </span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-800 hover:text-cyan-700 underline-offset-2 hover:underline"
                >
                  {s.name}
                </a>
                {s.note && (
                  <span className="text-slate-500 text-xs">
                    · {s.note}
                    {s.tag === "DENUE" && denueSource === "fallback" && (
                      <span className="text-amber-700"> (caché precalculado)</span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
