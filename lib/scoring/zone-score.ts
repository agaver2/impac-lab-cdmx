import { airQualityNow, crimeHotspots } from "../cdmx/ckan";
import { denueSearchNear, summarizeDenue, type DenueUnit } from "../cdmx/denue";
import {
  clamp,
  bandFromScore,
  WEIGHTS,
  type Mode,
  type SubscoreKey,
} from "./rubric";

export type Subscore = {
  key: SubscoreKey;
  label: string;
  value: number;
  reason: string;
  signal: number | null;
  available: boolean;
};

export type ConfidenceLevel = "alta" | "media" | "baja";

export type ZoneScoreResult = {
  mode: Mode;
  totalScore: number;
  band: "Excelente" | "Bueno" | "Regular" | "Bajo";
  subscores: Subscore[];
  reasons: string[];
  confidence: {
    level: ConfidenceLevel;
    sourcesAvailable: number;
    sourcesTotal: number;
    freshnessDays: number | null;
  };
  raw: {
    alcaldia?: string;
    crimeCountAlcaldia?: number;
    crimeRankAlcaldia?: number;
    crimeAlcaldiasTotal?: number;
    denueTotalInRadius?: number;
    denueTop?: { name: string; count: number }[];
    pm25Latest?: number | null;
    airZoneUsed?: string | null;
    transportUnitsNear?: number;
    bestBusinessType?: string | null;
  };
  generatedAt: string;
};

function normalizeAlcaldiaName(s: string | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function airZoneFromAlcaldia(alcaldia: string | undefined): string | undefined {
  if (!alcaldia) return undefined;
  const a = normalizeAlcaldiaName(alcaldia);
  // SIMAT zones per ADIP docs
  if (/(ALVARO OBREGON|CUAJIMALPA|MAGDALENA CONTRERAS|MIGUEL HIDALGO|AZCAPOTZALCO|GUSTAVO A MADERO)/.test(a)) return "NOROESTE";
  if (/(BENITO JUAREZ|CUAUHTEMOC|VENUSTIANO CARRANZA)/.test(a)) return "CENTRO";
  if (/(IZTACALCO|IZTAPALAPA|TLAHUAC|XOCHIMILCO|MILPA ALTA)/.test(a)) return "SURESTE";
  if (/(COYOACAN|TLALPAN)/.test(a)) return "SUROESTE";
  return "CENTRO";
}

function inferBestBusinessType(units: DenueUnit[]): string | null {
  if (units.length === 0) return null;
  const activities = new Map<string, number>();
  for (const u of units) {
    const a = u.Clase_actividad ?? "";
    activities.set(a, (activities.get(a) ?? 0) + 1);
  }
  // Candidates for "good business to open" — anti-saturation heuristic
  const candidates = [
    { label: "Cafetería o panadería", test: /cafeter|panader/i, saturationWord: /cafeter/i },
    { label: "Restaurante de especialidad", test: /restaurant|comida/i, saturationWord: /restaurant/i },
    { label: "Boutique o tienda de ropa", test: /ropa|boutique|vestido/i, saturationWord: /ropa/i },
    { label: "Gimnasio o estudio fitness", test: /gimnasio|fitness|yoga|pilates/i, saturationWord: /gimnasio/i },
    { label: "Coworking o espacio de oficinas", test: /oficin|cowork/i, saturationWord: /cowork/i },
    { label: "Farmacia de especialidad", test: /farmac/i, saturationWord: /farmac/i },
  ];
  // Count competitors per candidate; choose candidate with fewest direct competitors
  // but some supporting activity nearby.
  let best: { label: string; competitors: number; support: number } | null = null;
  for (const c of candidates) {
    let competitors = 0;
    let support = 0;
    for (const [act, n] of activities) {
      if (c.saturationWord.test(act)) competitors += n;
      else if (c.test.test(act)) support += n;
    }
    const score = support - competitors * 2;
    if (!best || score > best.competitors * -2 + best.support) {
      best = { label: c.label, competitors, support };
    }
  }
  return best?.label ?? null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export async function computeZoneScore(opts: {
  lat: number;
  lng: number;
  alcaldia?: string;
  colonia?: string;
  mode: Mode;
  radiusM?: number;
  year?: number;
}): Promise<ZoneScoreResult> {
  const radius = opts.radiusM ?? 500;
  // Default to last complete year. 2025 exists but is underreported in CKAN as of Abr-2026.
  const year = opts.year ?? 2024;
  const zoneAir = airZoneFromAlcaldia(opts.alcaldia);
  const normAlc = normalizeAlcaldiaName(opts.alcaldia);

  // Fire all 4 data sources in parallel
  const [crimeRes, denueRes, airRes, transportRes] = await Promise.allSettled([
    crimeHotspots({ year, topN: 16 }),
    denueSearchNear({ lat: opts.lat, lng: opts.lng, radiusM: radius }),
    airQualityNow(zoneAir, 1),
    denueSearchNear({
      lat: opts.lat,
      lng: opts.lng,
      radiusM: radius,
      keyword: "transporte",
    }),
  ]);

  // Single structured log line — makes Vercel log triage one-grep-away.
  const logStatus = (name: string, res: PromiseSettledResult<unknown>) => {
    if (res.status === "fulfilled") {
      const v = res.value as { records?: unknown[]; length?: number } | unknown[];
      const len = Array.isArray(v)
        ? v.length
        : (v as { records?: unknown[] })?.records?.length ?? "ok";
      return `${name}=ok(${len})`;
    }
    const msg = res.reason instanceof Error ? res.reason.message : String(res.reason);
    return `${name}=FAIL(${msg.slice(0, 160)})`;
  };
  console.log(
    `[zone-score] alcaldia="${opts.alcaldia ?? "(none)"}" year=${year} zoneAir=${zoneAir} ` +
      [
        logStatus("crime", crimeRes),
        logStatus("denue", denueRes),
        logStatus("air", airRes),
        logStatus("transport", transportRes),
      ].join(" "),
  );

  const subscores: Subscore[] = [];
  const reasons: string[] = [];
  let sourcesAvailable = 0;
  const sourcesTotal = 4;
  let freshnessDays: number | null = null;

  // --- Security ---
  let crimeCount: number | undefined;
  let crimeRank: number | undefined;
  let crimeTotal: number | undefined;
  if (crimeRes.status === "fulfilled" && crimeRes.value.records.length > 0) {
    sourcesAvailable++;
    const all = crimeRes.value.records
      .map((r) => ({
        name: normalizeAlcaldiaName(String(r.alcaldia_hecho ?? "")),
        delitos: Number(r.delitos ?? 0),
      }))
      .filter((r) => r.name);
    const sorted = [...all].sort((a, b) => b.delitos - a.delitos);
    crimeTotal = sorted.length;
    const ours = sorted.find((r) => r.name === normAlc);
    if (ours) {
      crimeCount = ours.delitos;
      crimeRank = sorted.indexOf(ours) + 1;
      const maxC = sorted[0].delitos || 1;
      const value = clamp(100 - (ours.delitos / maxC) * 100);
      subscores.push({
        key: "security",
        label: "Seguridad",
        value,
        reason: `${ours.delitos.toLocaleString("es-MX")} carpetas FGJ en ${year} — posición ${crimeRank} de ${crimeTotal} alcaldías (menos es mejor).`,
        signal: ours.delitos,
        available: true,
      });
      reasons.push(
        value >= 65
          ? `Seguridad relativa buena: alcaldía con menor incidencia que la mayoría (${ours.delitos.toLocaleString("es-MX")} carpetas).`
          : `Incidencia delictiva alta: ${ours.delitos.toLocaleString("es-MX")} carpetas FGJ en ${year} (posición ${crimeRank}/${crimeTotal}).`,
      );
    } else {
      // Didn't find alcaldía — use median as neutral
      const median = sorted[Math.floor(sorted.length / 2)].delitos;
      const value = 50;
      subscores.push({
        key: "security",
        label: "Seguridad",
        value,
        reason: `Alcaldía no identificada en agregación FGJ; usando mediana CDMX (${median.toLocaleString("es-MX")} carpetas).`,
        signal: median,
        available: true,
      });
    }
    // freshness: FGJ acumulado — assume year == current year or prior
    freshnessDays = year === new Date().getFullYear() ? 30 : 365;
  } else {
    const errMsg =
      crimeRes.status === "rejected"
        ? crimeRes.reason instanceof Error
          ? crimeRes.reason.message
          : String(crimeRes.reason)
        : "CKAN devolvió 0 filas";
    subscores.push({
      key: "security",
      label: "Seguridad",
      value: 50,
      reason: `FGJ no disponible: ${errMsg.slice(0, 120)}`,
      signal: null,
      available: false,
    });
  }

  // --- Commerce (DENUE density) ---
  let denueSummary: ReturnType<typeof summarizeDenue> | null = null;
  let bestBusinessType: string | null = null;
  if (denueRes.status === "fulfilled") {
    sourcesAvailable++;
    const units = denueRes.value;
    denueSummary = summarizeDenue(units);
    bestBusinessType = opts.mode === "business" ? inferBestBusinessType(units) : null;

    const density = units.length;
    let value: number;
    if (opts.mode === "business") {
      // For business: more activity = better (up to a ceiling)
      value = clamp((density / 300) * 100);
    } else {
      // For live: moderate density ideal. Peak around 150-200 units.
      if (density < 50) value = 40;
      else if (density < 300) value = clamp(70 + (density - 50) / 10);
      else value = clamp(90 - (density - 300) / 20);
    }
    subscores.push({
      key: "commerce",
      label: "Actividad comercial",
      value,
      reason:
        density === 0
          ? `Sin unidades económicas registradas en ${radius}m.`
          : `${density} unidades económicas en ${radius}m. Top: ${denueSummary.topActivities
              .slice(0, 2)
              .map((a) => a.name.toLowerCase())
              .join(", ") || "—"}.`,
      signal: density,
      available: true,
    });
    if (density > 200) reasons.push(`Actividad comercial densa: ${density} unidades en ${radius}m.`);
    if (opts.mode === "business" && bestBusinessType)
      reasons.push(`Nicho con oportunidad: ${bestBusinessType.toLowerCase()}.`);
  } else {
    const errMsg = denueRes.reason instanceof Error ? denueRes.reason.message : String(denueRes.reason);
    console.warn("DENUE fetch failed:", errMsg);
    subscores.push({
      key: "commerce",
      label: "Actividad comercial",
      value: 50,
      reason: `DENUE no disponible: ${errMsg.slice(0, 120)}`,
      signal: null,
      available: false,
    });
  }

  // --- Air ---
  // New SIMAT normalized shape from airQualityNow:
  // { zona, Fecha, fecha, pm10, o3, so2, no2, co }
  let pm25: number | null = null;
  if (airRes.status === "fulfilled" && airRes.value.records.length > 0) {
    sourcesAvailable++;
    const latest = airRes.value.records[0] as {
      zona?: string;
      Fecha?: string;
      fecha?: string;
      pm10?: number | null;
      o3?: number | null;
      so2?: number | null;
      no2?: number | null;
      co?: number | null;
    };
    const pm10 = typeof latest.pm10 === "number" ? latest.pm10 : null;
    pm25 = pm10; // reuse the field on the raw payload for UI/backcompat
    // PM10 scoring: WHO 24h guideline ≤45 µg/m³. CDMX typical 40–100.
    // Linear map: 30→100, 60→64, 90→28, 120→0.
    const idx = pm10 ?? 60; // neutral-bad fallback if missing
    const value = clamp(100 - Math.max(0, idx - 30) * 1.2);
    const partsMissing: string[] = [];
    if (pm10 === null) partsMissing.push("PM10");
    const reason =
      pm10 !== null
        ? `Zona ${zoneAir ?? "CENTRO"} (SIMAT): PM10 ${pm10.toFixed(0)} µg/m³ en última lectura.`
        : `Zona ${zoneAir ?? "CENTRO"} (SIMAT): lectura reciente sin PM10 reportado.`;
    subscores.push({
      key: "air",
      label: "Calidad del aire",
      value,
      reason,
      signal: pm10,
      available: true,
    });
    if (value < 45) reasons.push(`Calidad del aire deteriorada en zona ${zoneAir ?? "CENTRO"}.`);
    const latestFecha = (latest.Fecha ?? latest.fecha) as string | undefined;
    if (latestFecha) freshnessDays = daysSince(latestFecha);
  } else {
    const errMsg =
      airRes.status === "rejected"
        ? airRes.reason instanceof Error
          ? airRes.reason.message
          : String(airRes.reason)
        : "SIMAT devolvió 0 filas";
    subscores.push({
      key: "air",
      label: "Calidad del aire",
      value: 50,
      reason: `SIMAT no disponible: ${errMsg.slice(0, 120)}`,
      signal: null,
      available: false,
    });
  }

  // --- Mobility (proxy: DENUE transport units nearby) ---
  let transportCount = 0;
  if (transportRes.status === "fulfilled") {
    sourcesAvailable++;
    transportCount = transportRes.value.length;
    const value = clamp(Math.min(100, 30 + transportCount * 8));
    subscores.push({
      key: "mobility",
      label: "Movilidad",
      value,
      reason:
        transportCount === 0
          ? `Sin unidades de transporte registradas en DENUE en ${radius}m.`
          : `${transportCount} servicios de transporte registrados en ${radius}m.`,
      signal: transportCount,
      available: true,
    });
  } else {
    subscores.push({
      key: "mobility",
      label: "Movilidad",
      value: 50,
      reason: "Datos de movilidad no disponibles.",
      signal: null,
      available: false,
    });
  }

  // --- Market (heuristic proxy from DENUE until Tavily layer fills in) ---
  let marketValue: number;
  let marketReason: string;
  if (opts.mode === "business" && denueSummary) {
    const dens = denueSummary.total;
    if (dens === 0) {
      marketValue = 25;
      marketReason = "Cero actividad comercial en el radio — riesgo alto para abrir negocio.";
    } else if (dens < 60) {
      marketValue = 55;
      marketReason = `Baja densidad comercial (${dens} unidades) — menos competencia pero también menos tráfico.`;
    } else {
      marketValue = clamp(60 + Math.min(35, (dens - 60) / 10));
      marketReason = `Mercado comercial activo: ${dens} unidades en ${radius}m.`;
    }
  } else if (opts.mode === "live" && denueSummary) {
    const dens = denueSummary.total;
    // For living: mix of amenities close by is good, but too much = loud
    if (dens < 30) {
      marketValue = 50;
      marketReason = "Pocos servicios cercanos — zona tranquila pero menos amenidades.";
    } else if (dens < 200) {
      marketValue = clamp(70 + dens / 20);
      marketReason = `Buen balance: ${dens} servicios/comercios en ${radius}m.`;
    } else {
      marketValue = 75;
      marketReason = `Zona muy activa (${dens} unidades) — alta oferta pero también ruido comercial.`;
    }
  } else {
    marketValue = 50;
    marketReason = "Sin datos suficientes para evaluar mercado.";
  }
  subscores.push({
    key: "market",
    label: "Mercado",
    value: marketValue,
    reason: marketReason,
    signal: denueSummary?.total ?? null,
    available: denueSummary !== null,
  });

  // --- Compose total ---
  const weights = WEIGHTS[opts.mode];
  const total = subscores.reduce((acc, s) => acc + s.value * weights[s.key], 0);
  const totalScore = clamp(total);
  const band = bandFromScore(totalScore);

  // --- Confidence ---
  let level: ConfidenceLevel;
  if (sourcesAvailable >= 4) level = "alta";
  else if (sourcesAvailable >= 2) level = "media";
  else level = "baja";

  return {
    mode: opts.mode,
    totalScore,
    band,
    subscores,
    reasons,
    confidence: { level, sourcesAvailable, sourcesTotal, freshnessDays },
    raw: {
      alcaldia: opts.alcaldia,
      crimeCountAlcaldia: crimeCount,
      crimeRankAlcaldia: crimeRank,
      crimeAlcaldiasTotal: crimeTotal,
      denueTotalInRadius: denueSummary?.total,
      denueTop: denueSummary?.topActivities.slice(0, 5),
      pm25Latest: pm25,
      airZoneUsed: zoneAir ?? null,
      transportUnitsNear: transportCount,
      bestBusinessType,
    },
    generatedAt: new Date().toISOString(),
  };
}
