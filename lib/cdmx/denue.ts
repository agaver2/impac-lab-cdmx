import { cached } from "./cache";

const API_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta";
const TIMEOUT_MS = 20_000;

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

export async function denueSearchNear(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  keyword?: string;
}): Promise<DenueUnit[]> {
  const tk = process.env.INEGI_TOKEN;
  if (!tk) {
    throw new Error(
      "Missing INEGI_TOKEN. Register at https://www.inegi.org.mx/servicios/api_denue.html",
    );
  }
  const radius = Math.max(1, Math.floor(opts.radiusM ?? 500));
  const kw = opts.keyword ?? "todos";
  const url = `${API_BASE}/Buscar/${encodeURIComponent(kw)}/${opts.lat},${opts.lng}/${radius}/${tk}`;
  return cached<DenueUnit[]>("denue.near", { url }, 3600, async () => {
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
