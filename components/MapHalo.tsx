"use client";

import dynamic from "next/dynamic";

const MapHaloInner = dynamic(() => import("./MapHaloInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-500 text-sm border border-slate-200">
      Cargando mapa…
    </div>
  ),
});

export default MapHaloInner;
