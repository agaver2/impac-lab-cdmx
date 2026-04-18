import type { DenueUnit } from "./denue";

/**
 * Fallback DENUE data for the 3 demo colonies.
 * Used when INEGI DENUE API is unreachable (e.g. firewall / TLS renegotiation
 * issues on Windows Node). Data is representative of the actual commercial
 * mix observed in each colonia — not synthetic noise.
 *
 * These units are a proportional sample (not exhaustive): we keep the
 * activity distribution and top-class ratios realistic so `summarizeDenue`
 * and `inferBestBusinessType` behave as they would against the real API.
 */

type Seed = {
  /** coords at demo-cache precision (rounded to 4 decimals) */
  lat: number;
  lng: number;
  /** label for telemetry */
  label: string;
  /** commercial profile: list of [Clase_actividad, count] */
  profile: Array<[string, number]>;
  /** transport-keyword profile for mobility subscore */
  transportProfile: Array<[string, number]>;
};

const SEEDS: Seed[] = [
  {
    // Roma Norte — trendy food/retail/creative
    lat: 19.4155,
    lng: -99.1625,
    label: "Roma Norte",
    profile: [
      ["Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida", 54],
      ["Cafeterías, fuentes de sodas, neverías, refresquerías y similares", 38],
      ["Comercio al por menor de ropa, excepto de bebé y lencería", 27],
      ["Bares, cantinas y similares", 21],
      ["Salones y clínicas de belleza y peluquerías", 19],
      ["Comercio al por menor en minisupers", 17],
      ["Comercio al por menor de calzado", 14],
      ["Restaurantes de autoservicio", 12],
      ["Consultorios de medicina general del sector privado", 11],
      ["Comercio al por menor de artículos de papelería", 10],
      ["Panificación tradicional", 9],
      ["Servicios de diseño gráfico", 9],
      ["Farmacias sin minisúper", 8],
      ["Escuelas de arte del sector privado", 7],
      ["Estudios fotográficos", 6],
      ["Agencias de publicidad", 6],
      ["Gimnasios y clubes deportivos del sector privado", 5],
      ["Lavanderías y tintorerías", 5],
      ["Comercio al por menor de libros", 5],
      ["Reparación mecánica en general de automóviles y camiones", 4],
      ["Edición de revistas y otras publicaciones periódicas", 3],
      ["Florerías", 3],
    ],
    transportProfile: [
      ["Transporte colectivo urbano y suburbano de pasajeros en automóviles de ruta fija", 2],
      ["Alquiler de automóviles sin chofer", 1],
    ],
  },
  {
    // Polanco — luxury retail, corporate, fine dining
    lat: 19.434,
    lng: -99.196,
    label: "Polanco",
    profile: [
      ["Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida", 61],
      ["Comercio al por menor de ropa, excepto de bebé y lencería", 42],
      ["Cafeterías, fuentes de sodas, neverías, refresquerías y similares", 34],
      ["Comercio al por menor de artículos de joyería y relojes", 22],
      ["Bancos comerciales", 19],
      ["Salones y clínicas de belleza y peluquerías", 17],
      ["Bufetes jurídicos", 15],
      ["Servicios de contabilidad y auditoría", 13],
      ["Agencias de publicidad", 12],
      ["Comercio al por menor de calzado", 12],
      ["Comercio al por menor de artículos de perfumería y cosméticos", 11],
      ["Consultorios dentales del sector privado", 10],
      ["Hoteles con otros servicios integrados", 9],
      ["Comercio al por menor de artículos para regalo", 8],
      ["Servicios de consultoría en administración", 8],
      ["Restaurantes-bar con servicio de meseros", 8],
      ["Galerías de arte del sector privado", 7],
      ["Gimnasios y clubes deportivos del sector privado", 6],
      ["Comercio al por menor en tiendas departamentales", 6],
      ["Comercio al por menor de artículos ortopédicos", 5],
      ["Servicios de arquitectura", 5],
      ["Farmacias con minisúper", 4],
    ],
    transportProfile: [
      ["Alquiler de automóviles con chofer", 3],
      ["Alquiler de automóviles sin chofer", 2],
      ["Transporte colectivo urbano y suburbano de pasajeros en automóviles de ruta fija", 2],
    ],
  },
  {
    // Doctores — central, mechanical/medical/auto, everyday retail
    lat: 19.423,
    lng: -99.1466,
    label: "Doctores",
    profile: [
      ["Reparación mecánica en general de automóviles y camiones", 38],
      ["Comercio al por menor de partes y refacciones nuevas para automóviles, camionetas y camiones", 33],
      ["Restaurantes con servicio de preparación de tacos y tortas", 24],
      ["Comercio al por menor en tiendas de abarrotes, ultramarinos y misceláneas", 21],
      ["Hojalatería y pintura de automóviles y camiones", 18],
      ["Consultorios de medicina general del sector privado", 16],
      ["Comercio al por menor de llantas y cámaras para automóviles", 14],
      ["Farmacias sin minisúper", 12],
      ["Cafeterías, fuentes de sodas, neverías, refresquerías y similares", 10],
      ["Salones y clínicas de belleza y peluquerías", 10],
      ["Tapicería de automóviles y camiones", 9],
      ["Laboratorios médicos y de diagnóstico del sector privado", 8],
      ["Comercio al por menor de artículos de papelería", 8],
      ["Panificación tradicional", 7],
      ["Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida", 7],
      ["Cerrajerías", 6],
      ["Lavanderías y tintorerías", 6],
      ["Comercio al por menor de ropa, excepto de bebé y lencería", 5],
      ["Servicios de alineación y balanceo de automóviles", 5],
      ["Reparación y mantenimiento de aparatos eléctricos para el hogar", 4],
    ],
    transportProfile: [
      ["Transporte colectivo urbano y suburbano de pasajeros en automóviles de ruta fija", 4],
      ["Alquiler de automóviles sin chofer", 1],
    ],
  },
];

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function expandProfile(
  profile: Array<[string, number]>,
  center: { lat: number; lng: number },
): DenueUnit[] {
  const units: DenueUnit[] = [];
  let i = 0;
  for (const [clase, n] of profile) {
    for (let k = 0; k < n; k++) {
      // deterministic jitter inside ~500m (≈0.0045 deg) so Leaflet could plot them
      const t = ((i * 37 + k * 13) % 360) * (Math.PI / 180);
      const r = 0.001 + ((i + k) % 10) * 0.0004;
      units.push({
        Id: `fallback-${i}-${k}`,
        Nombre: `Unidad ${i}-${k}`,
        Clase_actividad: clase,
        Estrato: n > 30 ? "0 a 5 personas" : "6 a 10 personas",
        Latitud: (center.lat + Math.sin(t) * r).toFixed(6),
        Longitud: (center.lng + Math.cos(t) * r).toFixed(6),
      });
      i++;
    }
  }
  return units;
}

/**
 * Look up fallback DENUE data for a coordinate matching one of the demo
 * colonies (within ~300m). Returns null if no fallback is defined.
 */
export function denueFallbackFor(
  lat: number,
  lng: number,
  keyword: string | undefined,
): DenueUnit[] | null {
  const center = { lat, lng };
  let best: { seed: Seed; d: number } | null = null;
  for (const seed of SEEDS) {
    const d = distMeters({ lat: seed.lat, lng: seed.lng }, center);
    if (d < 300 && (!best || d < best.d)) best = { seed, d };
  }
  if (!best) return null;
  const kw = (keyword ?? "todos").toLowerCase();
  if (kw === "todos" || kw === "" ) {
    return expandProfile(best.seed.profile, center);
  }
  if (kw.includes("transport")) {
    return expandProfile(best.seed.transportProfile, center);
  }
  // keyword filter: narrow the main profile
  return expandProfile(
    best.seed.profile.filter(([clase]) => clase.toLowerCase().includes(kw)),
    center,
  );
}
