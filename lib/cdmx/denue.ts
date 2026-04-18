import { cached } from "./cache";
import { denueFallbackFor } from "./denue-fallback";

const API_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta";
const TIMEOUT_MS = 8_000;

export type DenueUnit = {
  CLEE?: string;
  Id?: string;
  Nombre?: string;
  Razon_social?: string;
  Clase_actividad?: string;
  Estrato?: string;
  Tipo_vialidad?: string;
  Calle?: string;
  Num_Exterior?: string;
  Num_Interior?: string;
  Colonia?: string;
  CP?: string;
  Ubicacion?: string;
  Telefono?: string;
  Correo_e?: string;
  Sitio_internet?: string;
  Tipo?: string;
  Longitud?: string;
  Latitud?: string;
  [k: string]: unknown;
};

export type DenueSource = "live" | "fallback";

export type DenueResult = {
  units: DenueUnit[];
  source: DenueSource;
};

/**
 * Search DENUE near a point. Attempts the live INEGI API first; on any failure
 * (missing token, network, TLS, timeout) falls back to hardcoded realistic
 * data for the 3 demo colonies. Returns `source` so the caller can annotate
 * confidence accordingly.
 *
 * The fallback is opt-out only if the caller doesn't care about demo resilience,
 * but right now every call path wants it.
 */
export async function denueSearchNear(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  keyword?: string;
}): Promise<DenueUnit[]> {
  const result = await denueSearchNearWithSource(opts);
  return result.units;
}

export async function denueSearchNearWithSource(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  keyword?: string;
}): Promise<DenueResult> {
  const radius = Math.max(1, Math.floor(opts.radiusM ?? 500));
  const kw = opts.keyword ?? "todos";
  const tk = process.env.INEGI_TOKEN;

  const tryLive = async (): Promise<DenueUnit[] | null> => {
    if (!tk) return null;
    const url = `${API_BASE}/Buscar/${encodeURIComponent(kw)}/${opts.lat},${opts.lng}/${radius}/${tk}`;
    try {
      return await cached<DenueUnit[]>("denue.near", { url }, 3600, async () => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
          const r = await fetch(url, { signal: ctrl.signal });
          if (!r.ok) throw new Error(`DENUE HTTP ${r.status}`);
          const text = await r.text();
          if (!text) return [];
          return JSON.parse(text) as DenueUnit[];
        } finally {
          clearTimeout(t);
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[denue] live fetch failed, using fallback: ${msg}`);
      return null;
    }
  };

  const live = await tryLive();
  if (live !== null && live.length > 0) {
    return { units: live, source: "live" };
  }
  const fallback = denueFallbackFor(opts.lat, opts.lng, opts.keyword);
  if (fallback !== null) {
    return { units: fallback, source: "fallback" };
  }
  // No live, no fallback — return empty rather than throwing, so the score
  // degrades gracefully for non-demo coordinates.
  return { units: live ?? [], source: "live" };
}

export function summarizeDenue(units: DenueUnit[]) {
  const byActivity = new Map<string, number>();
  const byStrato = new Map<string, number>();
  for (const u of units) {
    const a = u.Clase_actividad ?? "desconocido";
    byActivity.set(a, (byActivity.get(a) ?? 0) + 1);
    const s = u.Estrato ?? "desconocido";
    byStrato.set(s, (byStrato.get(s) ?? 0) + 1);
  }
  const topActivities = [...byActivity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  return {
    total: units.length,
    topActivities,
    byStrato: Object.fromEntries(byStrato),
  };
}
