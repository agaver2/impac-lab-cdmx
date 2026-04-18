"use client";

import { motion } from "framer-motion";

type Props = {
  text: string;
  loading?: boolean;
};

export default function Narrative({ text, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card p-6 relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="size-6 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-rose-500 text-white text-[10px] font-bold shadow-sm">
          C
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
          Lectura de Claude
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded scan-loader w-full" />
          <div className="h-3 rounded scan-loader w-5/6" />
          <div className="h-3 rounded scan-loader w-4/6" />
        </div>
      ) : (
        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
          {renderWithBold(text)}
        </p>
      )}
    </motion.div>
  );
}

function renderWithBold(text: string) {
  // Split on **...** and render bold spans, so Claude's emphasis comes through.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*.+\*\*$/.test(p) ? (
      <strong key={i} className="text-slate-900 font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
