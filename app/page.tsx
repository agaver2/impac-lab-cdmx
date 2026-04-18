"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useState } from "react";
import RadialGauge from "@/components/RadialGauge";
import ScoreCard from "@/components/ScoreCard";
import Narrative from "@/components/Narrative";
import FuentesBadge from "@/components/FuentesBadge";
import MapHalo from "@/components/MapHalo";
import MarketSignals from "@/components/MarketSignals";
import CompareBar from "@/components/CompareBar";

type Mode = "live" | "business";

type Subscore = {
  key: string;
  label: string;
  value: number;
  reason: string;
  available: boolean;
};

type ScoreResponse = {
  location: {
    lat: number;
    lng: number;
    formattedAddress: string;
    colonia?: string;
    alcaldia?: string;
  };
  score: {
    mode: Mode;
    totalScore: number;
    band: string;
    subscores: Subscore[];
    reasons: string[];
    confidence: {
      level: "alta" | "media" | "baja";
      sourcesAvailable: number;
      sourcesTotal: number;
      freshnessDays: number | null;
    };
    raw: {
      bestBusinessType?: string | null;
      denueTotalInRadius?: number;
      crimeCountAlcaldia?: number;
      crimeRankAlcaldia?: number;
    };
  };
  market: {
    liveListings: Array<{ title: string; url: string; snippet: string }>;
    commercialListings: Array<{ title: string; url: string; snippet: string }>;
  };
  narrative: string;
};

const DEMO_COLONIES = [
  { id: "polanco", label: "Polanco", sub: "Miguel Hidalgo" },
  { id: "roma-norte", label: "Roma Norte", sub: "Cuauhtémoc" },
  { id: "doctores", label: "Doctores", sub: "Cuauhtémoc" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("live");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [compareResult, setCompareResult] = useState<ScoreResponse | null>(null);
  const [comparing, setComparing] = useState(false);

  async function runScore(body: { query?: string; demoId?: string }) {
    setLoading(true);
    setError(null);
    setCompareResult(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "error" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data: ScoreResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    runScore({ query: query.trim() });
  }

  async function runDemo(id: string) {
    setQuery("");
    runScore({ demoId: id });
  }

  async function runCompare(demoId: string) {
    setComparing(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoId, mode }),
      });
      if (!res.ok) throw new Error("compare failed");
      const data: ScoreResponse = await res.json();
      setCompareResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-10 md:py-16">
      <motion.header layout className={result ? "mb-8" : "mb-14 text-center"}>
        <motion.div layout className="flex items-center gap-2 justify-center">
          <div className="size-2 rounded-full bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.55)]" />
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-700">
            ZonaMatch · CDMX
          </div>
        </motion.div>
        {!result && (
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-slate-900"
          >
            Decide dónde <span className="text-cyan-700">vivir</span> o{" "}
            <span className="text-rose-600">abrir negocio</span> con datos del
            gobierno.
          </motion.h1>
        )}
        {!result && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-slate-600 max-w-xl mx-auto"
          >
            Pega una dirección, colonia, coordenadas o un link de Google Maps.
            ZonaMatch calcula un score y te explica por qué, en lenguaje natural.
          </motion.p>
        )}
      </motion.header>

      <motion.form
        layout
        onSubmit={onSubmit}
        className={`card p-3 md:p-4 flex flex-col gap-3 ${
          result ? "" : "shadow-xl shadow-cyan-500/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-slate-100 p-1 text-sm border border-slate-200">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`px-4 py-1.5 rounded-full transition-colors font-medium ${
                mode === "live"
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Vivir aquí
            </button>
            <button
              type="button"
              onClick={() => setMode("business")}
              className={`px-4 py-1.5 rounded-full transition-colors font-medium ${
                mode === "business"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Abrir negocio
            </button>
          </div>
          <div className="ml-auto text-[11px] font-mono uppercase tracking-widest text-slate-400 hidden md:block">
            FGJ · SIMAT · DENUE · Tavily
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Reforma 222 CDMX, 19.4155,-99.1625, o link de Google Maps"
            className="flex-1 bg-transparent text-lg px-3 py-3 outline-none placeholder:text-slate-400 text-slate-900"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 rounded-xl font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? "Escaneando…" : "Analizar"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-mono uppercase tracking-widest mr-1">
            Ejemplos:
          </span>
          {DEMO_COLONIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => runDemo(c.id)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-40 border border-slate-200"
            >
              <span className="font-medium">{c.label}</span>{" "}
              <span className="text-slate-500">· {c.sub}</span>
            </button>
          ))}
        </div>
      </motion.form>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading && !result && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-12 flex flex-col items-center text-center gap-4"
          >
            <div className="relative size-20">
              <div className="halo-ring" />
              <div className="halo-ring delay-1" />
              <div className="halo-ring delay-2" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-3 rounded-full bg-cyan-600 shadow-[0_0_14px_rgba(8,145,178,0.6)]" />
              </div>
            </div>
            <div className="text-slate-500 text-sm font-mono uppercase tracking-widest">
              Consultando CKAN · DENUE · SIMAT · Tavily
            </div>
            <div className="h-1 w-48 rounded scan-loader" />
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <motion.section
          key={result.location.formattedAddress + result.score.mode}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 grid gap-5"
        >
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-5">
            <ScoreCard
              totalScore={result.score.totalScore}
              band={result.score.band}
              mode={result.score.mode}
              locationLabel={
                result.location.colonia ??
                result.location.formattedAddress.split(",")[0]
              }
              alcaldia={result.location.alcaldia}
            />
            <MapHalo
              lat={result.location.lat}
              lng={result.location.lng}
              radiusM={500}
            />
          </div>

          <div className="card-soft p-5">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4">
              Subscores
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {result.score.subscores.map((s) => (
                <RadialGauge
                  key={s.key}
                  value={s.value}
                  label={s.label}
                  sublabel={
                    s.reason.slice(0, 55) + (s.reason.length > 55 ? "…" : "")
                  }
                  available={s.available}
                />
              ))}
            </div>
          </div>

          <Narrative text={result.narrative} />

          {result.score.mode === "business" && result.score.raw.bestBusinessType && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="card p-5 bg-gradient-to-br from-rose-50 to-transparent border-rose-200"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-rose-600 mb-2">
                Sugerencia de giro
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {result.score.raw.bestBusinessType}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Inferido de la distribución DENUE en 500m — menor saturación
                directa con soporte comercial cercano.
              </div>
            </motion.div>
          )}

          {(result.market.liveListings.length > 0 ||
            result.market.commercialListings.length > 0) && (
            <MarketSignals
              live={result.market.liveListings}
              commercial={result.market.commercialListings}
              mode={result.score.mode}
            />
          )}

          <FuentesBadge confidence={result.score.confidence} />

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  Comparar con otra zona
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Un clic contra una colonia de referencia.
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {DEMO_COLONIES.filter(
                  (c) =>
                    !result.location.colonia
                      ?.toLowerCase()
                      .includes(c.label.toLowerCase()),
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => runCompare(c.id)}
                    disabled={comparing}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition disabled:opacity-40 border border-slate-200"
                  >
                    vs {c.label}
                  </button>
                ))}
              </div>
            </div>
            {comparing && <div className="mt-4 h-1 w-full rounded scan-loader" />}
            {compareResult && (
              <div className="mt-5">
                <CompareBar
                  a={{
                    label:
                      result.location.colonia ??
                      result.location.formattedAddress.split(",")[0],
                    totalScore: result.score.totalScore,
                    subscores: result.score.subscores,
                  }}
                  b={{
                    label:
                      compareResult.location.colonia ??
                      compareResult.location.formattedAddress.split(",")[0],
                    totalScore: compareResult.score.totalScore,
                    subscores: compareResult.score.subscores,
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2 pb-8">
            <button
              onClick={() => {
                setResult(null);
                setCompareResult(null);
                setQuery("");
              }}
              className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-cyan-700"
            >
              ← Analizar otra zona
            </button>
          </div>
        </motion.section>
      )}

      {!result && !loading && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center text-xs text-slate-500 space-y-2"
        >
          <div>
            Datos abiertos: CKAN CDMX · SIMAT · INEGI DENUE. Señales de mercado
            vía Tavily. Narrativa generada con Claude Sonnet 4.6.
          </div>
          <div className="font-mono uppercase tracking-widest text-slate-400">
            Claude Impact Lab CDMX · Abril 2026
          </div>
        </motion.footer>
      )}
    </main>
  );
}
