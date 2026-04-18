"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  value: number; // 0-100
  label: string;
  sublabel?: string;
  size?: number;
  available?: boolean;
};

export default function RadialGauge({
  value,
  label,
  sublabel,
  size = 140,
  available = true,
}: Props) {
  const [display, setDisplay] = useState(0);
  const radius = (size - 18) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dashOffset = circ - (pct / 100) * circ;
  const color = available
    ? pct >= 75
      ? "#15803D" // green-700
      : pct >= 55
      ? "#0E7490" // cyan-700
      : pct >= 40
      ? "#B45309" // amber-700
      : "#BE123C" // rose-700
    : "#94A3B8";  // slate-400

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(pct * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(15, 23, 42, 0.08)"
            strokeWidth={9}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="text-2xl font-semibold tracking-tight"
            style={{ color }}
          >
            {available ? display : "—"}
          </div>
          {available ? (
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              /100
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              s/d
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
