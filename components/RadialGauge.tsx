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
      ? "#84CC16"
      : pct >= 55
      ? "#22D3EE"
      : pct >= 40
      ? "#F59E0B"
      : "#FB7185"
    : "#52525B";

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
            stroke="rgba(255,255,255,0.06)"
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
          <div className="text-2xl font-semibold tracking-tight" style={{ color }}>
            {available ? display : "—"}
          </div>
          {available ? (
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              /100
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              s/d
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        {sublabel && <div className="text-xs text-zinc-500 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
