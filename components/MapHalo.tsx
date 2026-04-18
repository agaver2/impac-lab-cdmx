"use client";

import dynamic from "next/dynamic";

const MapHaloInner = dynamic(() => import("./MapHaloInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] rounded-2xl bg-zinc-900 animate-pulse flex items-center justify-center text-zinc-600 text-sm">
      Cargando mapa...
    </div>
  ),
});

export default MapHaloInner;
