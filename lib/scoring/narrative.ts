import Anthropic from "@anthropic-ai/sdk";
import type { ZoneScoreResult } from "./zone-score";
import type { MarketSignals } from "../cdmx/tavily";
import { env } from "../env";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Eres **ZonaMatch**, un asistente que evalúa ubicaciones de la Ciudad de México para dos escenarios: **vivir** y **abrir negocio**. Hablas español mexicano natural y directo.

## Tu trabajo
Recibes (1) un score numérico total y subscores calculados a partir de datos oficiales, (2) señales crudas (conteo de carpetas FGJ por alcaldía, densidad DENUE, PM2.5 SIMAT, etc.), y (3) un nivel de confianza basado en qué fuentes respondieron.

Devuelves **3-4 oraciones** que:
1. Den un veredicto claro (qué tan buena es para el modo elegido).
2. Mencionen la señal más decisiva con números concretos — FGJ, DENUE, aire. No inventes cifras; úsa sólo las que vienen en el input.
3. Si el modo es *business*, sugieren un giro concreto cuando haya data para inferirlo.
4. Incluyen la confianza y, si aplica, un caveat sobre frescura o cobertura de datos.

## Reglas
- **Nunca inventes** números, colonias o giros. Si el input no los trae, no los menciones.
- **Evita adjetivos vacíos** ("increíble", "excelente") — prefiere "posición 3 de 16 alcaldías por carpetas FGJ" o "230 unidades económicas en 500m".
- No uses bullets ni headers. Sólo prosa densa, profesional, sin floritura.
- Si el score total es < 45, sé honesto: "zona con retos importantes".
- Cierra con una micro-recomendación accionable (ej. "considera comparar con una alcaldía vecina").
- Todo en español de México. Tono: analista inmobiliario confiable, no marketer.

## Ejemplo
Input: Polanco, mode=business, total=78, security=82, commerce=88, raw.denueTotalInRadius=312, raw.bestBusinessType="Cafetería o panadería", confidence=alta.
Output: "Polanco sostiene un puntaje de 78/100 para abrir negocio. La zona concentra 312 unidades económicas en 500m, con Miguel Hidalgo entre las alcaldías con menor incidencia delictiva (posición 12 de 16). El nicho con menos saturación directa y soporte comercial es **cafetería o panadería de especialidad**. Confianza alta; datos FGJ del último corte anual."`;

export async function generateNarrative(opts: {
  score: ZoneScoreResult;
  locationLabel: string;
  market?: MarketSignals;
}): Promise<string> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) {
    console.warn("[narrative] ANTHROPIC_API_KEY missing — using fallback narrative");
    return fallbackNarrative(opts);
  }
  const client = new Anthropic({ apiKey: key });

  const marketBlurb =
    opts.market && (opts.market.liveListings.length + opts.market.commercialListings.length) > 0
      ? `\nSeñales de mercado (Tavily, no-oficial): ${
          opts.market.liveListings.length
        } anuncios de vivienda + ${
          opts.market.commercialListings.length
        } anuncios comerciales encontrados.`
      : "";

  const userPayload = {
    ubicacion: opts.locationLabel,
    modo: opts.score.mode,
    score_total: opts.score.totalScore,
    banda: opts.score.band,
    subscores: opts.score.subscores.map((s) => ({
      key: s.key,
      value: s.value,
      reason: s.reason,
    })),
    señales_crudas: opts.score.raw,
    confianza: opts.score.confidence,
    market_notes: marketBlurb,
  };

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Genera la narrativa (3-4 oraciones, prosa). Datos:\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    });
    const text = res.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("\n")
      .trim();
    return text || fallbackNarrative(opts);
  } catch (err) {
    console.error("Claude narrative failed:", err);
    return fallbackNarrative(opts);
  }
}

function fallbackNarrative(opts: { score: ZoneScoreResult; locationLabel: string }): string {
  const s = opts.score;
  const modeLabel = s.mode === "live" ? "vivir" : "abrir negocio";
  const topReason = s.reasons[0] ?? s.subscores[0]?.reason ?? "";
  return `${opts.locationLabel} obtiene ${s.totalScore}/100 para ${modeLabel} (${s.band}). ${topReason} Confianza ${s.confidence.level} con ${s.confidence.sourcesAvailable}/${s.confidence.sourcesTotal} fuentes disponibles.`;
}
