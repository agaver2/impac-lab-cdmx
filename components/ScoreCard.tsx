"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  totalScore: number;
  band: string;
  mode: "live" | "business";
  locationLabel: string;
  alcaldia?: string;
};

const BAND_COLORS: Record<string, string> = {
  Excelente: "#84CC16",
  Bueno: "#22D3EE",
  Regular: "#F59E0B",
  Bajo: "#FB7185",
};

export default function ScoreCard({
  totalScore,
  band,
  mode,
  locationLabel,
  alcaldia,
}: Props) {
  const [n, setN] = useState(0);
  const color = BAND_COLORS[band] ?? "#22D3EE";

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(totalScore * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalScore]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-8 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
            <span>Modo</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: "rgba(34,211,238,0.15)", color: "#67E8F9" }}
            >
              {mode === "live" ? "Vivir aquí" : "Abrir negocio"}
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{locationLabel}</h2>
          {alcaldia && <div className="text-sm text-zinc-500">Alcaldía {alcaldia}</div>}
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          {band}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="text-7xl font-semibold tracking-tighter leading-none" style={{ color }}>
          {n}
        </div>
        <div className="text-zinc-500 pb-2 text-lg font-mono">/100</div>
      </div>
    </motion.div>
  );
}
