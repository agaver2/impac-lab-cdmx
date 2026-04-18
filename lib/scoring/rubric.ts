export type Mode = "live" | "business";

export type SubscoreKey = "security" | "commerce" | "air" | "mobility" | "market";

export const WEIGHTS: Record<Mode, Record<SubscoreKey, number>> = {
  live: { security: 0.35, commerce: 0.15, air: 0.2, mobility: 0.15, market: 0.15 },
  business: { security: 0.25, commerce: 0.25, air: 0.1, mobility: 0.15, market: 0.25 },
};

export const SUBSCORE_LABELS: Record<SubscoreKey, string> = {
  security: "Seguridad",
  commerce: "Actividad comercial",
  air: "Calidad del aire",
  mobility: "Movilidad",
  market: "Mercado",
};

export function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function bandFromScore(score: number): "Excelente" | "Bueno" | "Regular" | "Bajo" {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Bueno";
  if (score >= 45) return "Regular";
  return "Bajo";
}

// Heuristic thresholds — tuned for CDMX scale.
export const THRESHOLDS = {
  denueHeavy: 300, // ≥300 units in 500m = very commercial
  pm25Unhealthy: 55, // μg/m³
  crimePerYearHigh: 40000, // top-alcaldía FGJ count per year
};
