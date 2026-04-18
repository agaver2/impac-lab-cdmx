"use client";

import { motion } from "framer-motion";

type ZoneSummary = {
  label: string;
  totalScore: number;
  subscores: Array<{ key: string; label: string; value: number }>;
};

type Props = {
  a: ZoneSummary;
  b: ZoneSummary;
};

const KEYS = ["security", "commerce", "air", "mobility", "market"] as const;

export default function CompareBar({ a, b }: Props) {
  const winner =
    a.totalScore === b.totalScore
      ? "tie"
      : a.totalScore > b.totalScore
      ? "a"
      : "b";

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
          Comparativa lado a lado
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ZoneColumn zone={a} isWinner={winner === "a"} side="a" />
        <ZoneColumn zone={b} isWinner={winner === "b"} side="b" />
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-200">
        {KEYS.map((k) => {
          const av = a.subscores.find((s) => s.key === k)?.value ?? 0;
          const bv = b.subscores.find((s) => s.key === k)?.value ?? 0;
          const label = a.subscores.find((s) => s.key === k)?.label ?? k;
          return (
            <SubscoreRow
              key={k}
              label={label}
              a={av}
              b={bv}
              aLabel={a.label}
              bLabel={b.label}
            />
          );
        })}
      </div>
    </div>
  );
}

function ZoneColumn({
  zone,
  isWinner,
  side,
}: {
  zone: ZoneSummary;
  isWinner: boolean;
  side: "a" | "b";
}) {
  const winnerColor = side === "a" ? "#0E7490" : "#BE123C";
  return (
    <div
      className={`p-4 rounded-xl border ${
        isWinner
          ? side === "a"
            ? "bg-cyan-50 border-cyan-200"
            : "bg-rose-50 border-rose-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="text-sm text-slate-600 font-medium">{zone.label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div
          className="text-4xl font-semibold tracking-tight"
          style={{ color: isWinner ? winnerColor : "#64748B" }}
        >
          {zone.totalScore}
        </div>
        <div className="text-slate-400 text-sm font-mono">/100</div>
        {isWinner && (
          <div
            className="ml-auto text-[10px] font-mono uppercase tracking-widest font-semibold"
            style={{ color: winnerColor }}
          >
            ganador
          </div>
        )}
      </div>
    </div>
  );
}

function SubscoreRow({
  label,
  a,
  b,
  aLabel,
  bLabel,
}: {
  label: string;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 text-xs">
      <div className="text-right">
        <div className="text-slate-600 font-medium">{a}</div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${a}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-1.5 rounded-l-full bg-cyan-500 ml-auto"
          style={{ maxWidth: "100%" }}
          aria-label={`${aLabel} ${label}`}
        />
      </div>
      <div className="text-center text-slate-500 font-mono uppercase tracking-widest">
        {label}
      </div>
      <div>
        <div className="text-slate-600 font-medium">{b}</div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${b}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-1.5 rounded-r-full bg-rose-500"
          aria-label={`${bLabel} ${label}`}
        />
      </div>
    </div>
  );
}
