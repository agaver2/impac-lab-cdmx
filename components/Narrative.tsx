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
      className="card-soft p-6 relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="size-6 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500 text-white text-[10px] font-bold">
          C
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
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
        <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
          {text.replace(/\*\*(.+?)\*\*/g, "$1")}
        </p>
      )}
    </motion.div>
  );
}
