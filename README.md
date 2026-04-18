# ZonaMatch CDMX

**Decision cockpit for Mexico City**: paste a colonia, address, lat/lng, or a Google Maps link → get a 0–100 score for either "Vivir aquí" (*live here*) or "Abrir negocio" (*open a business*), backed by live CDMX open data and a Claude-written rationale in natural language.

Live demo → **https://impac-lab-cdmx.vercel.app/**

Built in one afternoon for **Claude Impact Lab CDMX — April 18, 2026**. Track: *Challenge Abierto*.

---

## What it does

Five subscores, weighted per mode, averaged into a single number with a confidence badge:

| Subscore | Source | What it measures |
|---|---|---|
| **Seguridad** | CKAN CDMX — Fiscalía FGJ `carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico` | Rank of the alcaldía among the 16, by 2024 criminal investigations. |
| **Actividad comercial** | INEGI DENUE `/Buscar/...` | Economic units within 500 m of the point, grouped by `nombre_act` (activity). |
| **Calidad del aire** | CKAN CDMX — SIMAT `indice-de-calidad-del-aire` | Most recent PM10 reading for the Noroeste / Noreste / Centro / Suroeste / Sureste zone the point falls in. |
| **Movilidad** | INEGI DENUE (transport activities in radius) | Proxy for formal transport services nearby. |
| **Mercado** | Tavily search | Listings for rent/commercial space in the colonia (context, not authoritative). |

On top of that, Claude Sonnet 4.6 writes a 3–5-sentence rationale that cites the real numbers, and — in business mode — suggests a concrete business type ("coworking", "cafetería de especialidad"…) inferred from the DENUE distribution (looking for under-saturated niches adjacent to dense support activities).

You can also run a side-by-side **comparativa** against Polanco / Roma Norte / Doctores with one click.

## Architecture at a glance

```
┌──────────────────────────────────────┐
│ Next.js 16 (App Router, Turbopack)   │
│ app/page.tsx  →  /api/score          │
└──────────────┬───────────────────────┘
               │
               ├─→ lib/cdmx/places.ts      → Google Places · Nominatim fallback
               ├─→ lib/cdmx/ckan.ts        → datos.cdmx.gob.mx SQL API
               ├─→ lib/cdmx/denue.ts       → INEGI DENUE REST (with cached fallback)
               ├─→ lib/cdmx/tavily.ts      → tavily.com search
               ├─→ lib/scoring/zone-score  → weighted composition (mode-aware)
               └─→ lib/scoring/narrative   → Anthropic SDK w/ prompt caching
```

Everything runs in a single Next.js process. No MCP is required at runtime — the companion [`cdmx-mcp`](https://github.com/devcsar/cdmx-mcp) fork was used during build to *explore* the datasets with Claude Code (`query_records`, `describe_dataset`, `crime_hotspots`, `denue_near`), and those adapters were ported to TypeScript here.

## Run it locally

**Requires** Node 20+ and the following API keys:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_PLACES_API_KEY=...       # for geocoding / reverse geocoding
INEGI_TOKEN=...                  # https://www.inegi.org.mx/servicios/api_denue.html
TAVILY_API_KEY=tvly-...          # https://tavily.com (free tier)
```

```bash
npm install
npm run dev
open http://localhost:3000
```

The three demo buttons (**Polanco**, **Roma Norte**, **Doctores**) go through a pre-computed cache in `lib/demo-cache.ts`, so even if CDMX's CKAN is unreachable during the demo, the flow still works.

## Endpoint reference

```
POST /api/score
Content-Type: application/json

{ "query": "Reforma 222, CDMX", "mode": "business" }
  or
{ "demoId": "polanco", "mode": "live" }
```

Returns `{ location, score, market, narrative }`. See `lib/scoring/zone-score.ts` for the full shape.

## Design decisions

1. **Mode-aware scoring**, not just a raw "livability" index. What's bad for *vivir* (dense nightlife, high foot traffic) is good for *negocio*, and vice versa. Rubric weights differ per mode (`lib/scoring/rubric.ts`).
2. **Prompt caching** (Anthropic `cache_control: "ephemeral"`) on the ~1000-token scoring rubric + few-shot examples in the system prompt. The second call (the comparativa) pays only output tokens.
3. **Graceful degradation when CDMX feeds are flaky**. SIMAT's 409s and intermittent FGJ 403s from serverless runners are caught per-source: the score returns with `confidence: "media"` and the narrative acknowledges the gap honestly instead of faking data. The `FuentesBadge` lists exactly which sources were live.
4. **The 16 alcaldías as a closed whitelist** (`lib/cdmx/geo.ts`). Google Geocoding's `address_components` conflate sublocality and alcaldía in CDMX — "Polanco IV Sección" comes back as `sublocality_level_1` but isn't the alcaldía. All components are scanned against the canonical list before trusting any of them.

## Data sources

- **FGJ carpetas de investigación** — https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico
- **SIMAT índice de calidad del aire** — https://datos.cdmx.gob.mx/dataset/indice-de-calidad-del-aire (wide-table schema: one column per zone × pollutant, `Fecha` timestamp)
- **INEGI DENUE** — https://www.inegi.org.mx/servicios/api_denue.html
- **Tavily search** — https://tavily.com (market signals; non-authoritative)

## Stack

Next.js 16 · TypeScript · Tailwind v4 · React Leaflet (CARTO Positron tiles) · Framer Motion · Anthropic SDK (Sonnet 4.6 + ephemeral prompt caching) · Tavily SDK.

## License

MIT. Built with Claude Code in one afternoon.
