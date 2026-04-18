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

export function normalizeAlcaldia(name: string): string {
  if (!name) return "";
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return ALCALDIA_ALIASES[s] ?? s;
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
