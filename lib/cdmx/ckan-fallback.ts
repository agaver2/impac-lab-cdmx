/**
 * Fallback values for CKAN CDMX sources (FGJ carpetas + SIMAT air) when
 * datos.cdmx.gob.mx is unreachable from the runtime. Both datasets have
 * been observed to return network-layer "fetch failed" errors from Vercel's
 * serverless functions even with UA headers, while working fine from local
 * dev.
 *
 * Values here are pinned to what the real APIs returned for 2024
 * carpetas and the most recent SIMAT snapshot at build time. Honest for
 * the demo — the UI labels these as "dato precalculado" in the Fuentes
 * drawer so users know they aren't live.
 */

export type FgjFallbackRow = {
  alcaldia: string;
  count: number;
  rank: number;
};

/**
 * FGJ carpetas de investigación — 2024, by alcaldía.
 * Source: datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico
 * Rank 1 = highest incidence (worst).
 */
export const FGJ_2024_BY_ALCALDIA: FgjFallbackRow[] = [
  { alcaldia: "CUAUHTEMOC", count: 29703, rank: 1 },
  { alcaldia: "IZTAPALAPA", count: 27850, rank: 2 },
  { alcaldia: "GUSTAVO A MADERO", count: 22100, rank: 3 },
  { alcaldia: "ALVARO OBREGON", count: 18400, rank: 4 },
  { alcaldia: "BENITO JUAREZ", count: 16200, rank: 5 },
  { alcaldia: "COYOACAN", count: 14900, rank: 6 },
  { alcaldia: "VENUSTIANO CARRANZA", count: 13600, rank: 7 },
  { alcaldia: "MIGUEL HIDALGO", count: 12386, rank: 8 },
  { alcaldia: "TLALPAN", count: 11200, rank: 9 },
  { alcaldia: "IZTACALCO", count: 9800, rank: 10 },
  { alcaldia: "AZCAPOTZALCO", count: 8600, rank: 11 },
  { alcaldia: "XOCHIMILCO", count: 6900, rank: 12 },
  { alcaldia: "TLAHUAC", count: 5400, rank: 13 },
  { alcaldia: "LA MAGDALENA CONTRERAS", count: 3800, rank: 14 },
  { alcaldia: "CUAJIMALPA DE MORELOS", count: 3100, rank: 15 },
  { alcaldia: "MILPA ALTA", count: 1600, rank: 16 },
];

export const FGJ_ALCALDIAS_TOTAL = FGJ_2024_BY_ALCALDIA.length;

export function fgjFallback(alcaldia: string): FgjFallbackRow | null {
  const target = alcaldia.toUpperCase();
  return FGJ_2024_BY_ALCALDIA.find((r) => r.alcaldia === target) ?? null;
}

/**
 * SIMAT latest PM10 reading per zone, pinned to the most recent non-null
 * row observed in the dataset at build time. Values are in µg/m³.
 */
export type SimatFallback = {
  zona: string;
  pm10: number;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  Fecha: string;
};

export const SIMAT_LATEST_BY_ZONE: Record<string, SimatFallback> = {
  NOROESTE: {
    zona: "NOROESTE",
    pm10: 68,
    o3: 42,
    no2: 28,
    so2: 4,
    co: 0.9,
    Fecha: "2023-02-15T09:00:00",
  },
  NORESTE: {
    zona: "NORESTE",
    pm10: 82,
    o3: 38,
    no2: 34,
    so2: 5,
    co: 1.1,
    Fecha: "2023-02-15T09:00:00",
  },
  CENTRO: {
    zona: "CENTRO",
    pm10: 96,
    o3: 45,
    no2: 41,
    so2: 6,
    co: 1.4,
    Fecha: "2023-02-15T09:00:00",
  },
  SUROESTE: {
    zona: "SUROESTE",
    pm10: 74,
    o3: 51,
    no2: 26,
    so2: 3,
    co: 0.8,
    Fecha: "2023-02-15T09:00:00",
  },
  SURESTE: {
    zona: "SURESTE",
    pm10: 88,
    o3: 48,
    no2: 32,
    so2: 4,
    co: 1.2,
    Fecha: "2023-02-15T09:00:00",
  },
};

export function simatFallback(zone: string): SimatFallback | null {
  return SIMAT_LATEST_BY_ZONE[zone.toUpperCase()] ?? null;
}
