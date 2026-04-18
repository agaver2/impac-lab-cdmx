export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ALCALDIA_ALIASES: Record<string, string> = {
  cuajimalpa: "cuajimalpa de morelos",
  gam: "gustavo a madero",
  "gustavo a. madero": "gustavo a madero",
  "magdalena contreras": "la magdalena contreras",
};

/**
 * The 16 CDMX alcaldías, normalized (lowercased, no accents, no punctuation).
 * Used to pick the right `address_component` out of the Google Geocoding
 * response: components like "Polanco IV Sección" (sublocality) look like
 * alcaldía fields but aren't one.
 */
export const KNOWN_ALCALDIAS = [
  "alvaro obregon",
  "azcapotzalco",
  "benito juarez",
  "coyoacan",
  "cuajimalpa de morelos",
  "cuauhtemoc",
  "gustavo a madero",
  "iztacalco",
  "iztapalapa",
  "la magdalena contreras",
  "miguel hidalgo",
  "milpa alta",
  "tlahuac",
  "tlalpan",
  "venustiano carranza",
  "xochimilco",
] as const;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAlcaldia(name: string): string {
  if (!name) return "";
  const s = stripDiacritics(name).toLowerCase().trim();
  return ALCALDIA_ALIASES[s] ?? s;
}

/**
 * Given any place name (e.g. address_component `long_name`), return the
 * canonical alcaldía name in UPPERCASE no-accents form (matching CKAN FGJ's
 * `alcaldia_hecho` column). Returns null if the string doesn't clearly name
 * one of the 16 alcaldías.
 */
export function matchKnownAlcaldia(name: string | undefined): string | null {
  if (!name) return null;
  const s = stripDiacritics(name)
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
  if (!s) return null;
  // Exact alias hit
  const aliased = ALCALDIA_ALIASES[s] ?? s;
  for (const a of KNOWN_ALCALDIAS) {
    if (a === aliased) return a.toUpperCase();
  }
  // Substring / contains (handles "Alcaldía Miguel Hidalgo" or "Miguel Hidalgo, CDMX")
  for (const a of KNOWN_ALCALDIAS) {
    if (aliased.includes(a) || a.includes(aliased)) return a.toUpperCase();
  }
  // Short-name cases like "Cuajimalpa" without "de Morelos"
  const truncated = aliased.split(/\s+de\s+/)[0];
  for (const a of KNOWN_ALCALDIAS) {
    const aTrunc = a.split(/\s+de\s+/)[0];
    if (aTrunc === truncated) return a.toUpperCase();
  }
  return null;
}

export function bboxFromPoint(
  lat: number,
  lng: number,
  radiusMeters: number,
): [number, number, number, number] {
  const dLat = radiusMeters / 111_000;
  const dLng = radiusMeters / (111_000 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}
