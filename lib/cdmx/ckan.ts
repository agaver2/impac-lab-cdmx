import { cached } from "./cache";

const BASE = "https://datos.cdmx.gob.mx/api/3/action";
const TIMEOUT_MS = 30_000;

export const KNOWN_DATASETS: Record<string, string> = {
  fgj: "carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico",
  "911": "llamadas-numero-de-atencion-a-emergencias-911",
  ids: "indice-de-desarrollo-social-de-la-ciudad-de-mexico-2020",
  aire: "indice-de-calidad-del-aire",
};

async function ckanGet<T = unknown>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // Some CDN fronts on datos.cdmx.gob.mx reject requests without a UA
    // (we saw intermittent 403s from serverless runners). Send a polite UA.
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "zonamatch-cdmx/0.1 (+https://github.com/zonamatch/zonamatch)",
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      const snippet = await r.text().then((s) => s.slice(0, 200)).catch(() => "");
      throw new Error(`CKAN HTTP ${r.status} on ${path}: ${snippet}`);
    }
    const body = (await r.json()) as { success: boolean; result: T; error?: unknown };
    if (!body.success) throw new Error(`CKAN error on ${path}: ${JSON.stringify(body.error)}`);
    return body.result;
  } finally {
    clearTimeout(t);
  }
}

const WHERE_OP_RE =
  /(?<!")\b([a-zA-Z_][a-zA-Z0-9_]*)\b\s*(!=|<>|<=|>=|=|<|>|LIKE|ILIKE)/gi;
const RESERVED = new Set([
  "and",
  "or",
  "not",
  "in",
  "is",
  "null",
  "like",
  "ilike",
  "between",
]);

function translateWhere(where: string | undefined): string {
  if (!where) return "";
  const out = where.replace(/"/g, "'");
  return out.replace(WHERE_OP_RE, (_m, ident: string, op: string) => {
    if (RESERVED.has(ident.toLowerCase())) return `${ident} ${op}`;
    return `"${ident}" ${op}`;
  });
}

function translateOrderBy(orderBy: string | undefined): string {
  if (!orderBy) return "";
  return orderBy
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const toks = chunk.split(/\s+/);
      const col = toks[0].replace(/"/g, "");
      const dir = toks[1] ?? "ASC";
      return `"${col}" ${dir}`;
    })
    .join(", ");
}

type CkanResource = { id: string; datastore_active?: boolean; name?: string; description?: string; url?: string };
type CkanPackage = { resources?: CkanResource[]; title?: string; metadata_modified?: string; name?: string; notes?: string };

async function packageShow(slug: string): Promise<CkanPackage> {
  return cached<CkanPackage>("ckan.package", { id: slug }, 3600, () =>
    ckanGet<CkanPackage>("/package_show", { id: slug }),
  );
}

async function resourceFor(slug: string, year?: number): Promise<string> {
  const pkg = await packageShow(slug);
  const resources = (pkg.resources ?? []).filter((r) => r.datastore_active);
  if (resources.length === 0) {
    throw new Error(
      `Dataset '${slug}' has no datastore_active resources — CKAN SQL cannot query it.`,
    );
  }
  const blob = (r: CkanResource) =>
    `${r.name ?? ""} ${r.description ?? ""} ${r.url ?? ""}`.toLowerCase();
  if (year !== undefined) {
    const hit = resources.find((r) => blob(r).includes(String(year)));
    if (hit) return hit.id;
  }
  const acumulados = resources.filter((r) => blob(r).includes("acumulado"));
  if (acumulados.length > 0) {
    acumulados.sort((a, b) => {
      const ya = Number((blob(a).match(/(20\d{2})/) ?? [0, 0])[1]);
      const yb = Number((blob(b).match(/(20\d{2})/) ?? [0, 0])[1]);
      return yb - ya;
    });
    return acumulados[0].id;
  }
  return resources[0].id;
}

export type DatasetInfo = {
  dataset_id: string;
  title: string;
  records_count: number | null;
  modified: string | null;
  fields: { name: string; type: string; label: string }[];
};

export async function describeDataset(datasetId: string): Promise<DatasetInfo> {
  const slug = KNOWN_DATASETS[datasetId] ?? datasetId;
  return cached<DatasetInfo>("ckan.describe", { id: slug }, 3600, async () => {
    const pkg = await packageShow(slug);
    let fields: DatasetInfo["fields"] = [];
    let total: number | null = null;
    for (const r of pkg.resources ?? []) {
      if (!r.datastore_active) continue;
      const info = (await ckanGet<{
        fields: { id: string; type: string }[];
        total: number;
      }>("/datastore_search", { resource_id: r.id, limit: 0 })) as {
        fields: { id: string; type: string }[];
        total: number;
      };
      fields = info.fields
        .filter((f) => f.id && f.id !== "_id")
        .map((f) => ({ name: f.id, type: f.type, label: f.id }));
      total = info.total ?? null;
      break;
    }
    return {
      dataset_id: slug,
      title: pkg.title ?? slug,
      records_count: total,
      modified: pkg.metadata_modified ?? null,
      fields,
    };
  });
}

export type RecordsResult<T = Record<string, unknown>> = {
  total_count: number;
  returned: number;
  records: T[];
};

export async function queryRecords<T = Record<string, unknown>>(opts: {
  datasetId: string;
  where?: string;
  select?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  year?: number;
}): Promise<RecordsResult<T>> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = opts.offset ?? 0;
  const slug = KNOWN_DATASETS[opts.datasetId] ?? opts.datasetId;
  return cached<RecordsResult<T>>(
    "ckan.records",
    { slug, ...opts, limit, offset },
    600,
    async () => {
      const rid = await resourceFor(slug, opts.year);
      const cols = opts.select
        ? opts.select
            .split(",")
            .map((c) => `"${c.trim()}"`)
            .join(", ")
        : "*";
      let sql = `SELECT ${cols} FROM "${rid}"`;
      const w = translateWhere(opts.where);
      if (w) sql += ` WHERE ${w}`;
      const o = translateOrderBy(opts.orderBy);
      if (o) sql += ` ORDER BY ${o}`;
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
      const res = await ckanGet<{ records: T[] }>("/datastore_search_sql", { sql });
      return {
        total_count: res.records.length,
        returned: res.records.length,
        records: res.records,
      };
    },
  );
}

export type AggregateRow = Record<string, string | number>;

export async function aggregate(opts: {
  datasetId: string;
  groupBy: string;
  metric?: string;
  where?: string;
  limit?: number;
  year?: number;
}): Promise<{ total_count: number; records: AggregateRow[] }> {
  const metric = opts.metric ?? "count(*) as total";
  const limit = Math.min(500, Math.max(1, opts.limit ?? 50));
  const slug = KNOWN_DATASETS[opts.datasetId] ?? opts.datasetId;
  return cached(
    "ckan.aggregate",
    { slug, ...opts, metric, limit },
    600,
    async () => {
      const rid = await resourceFor(slug, opts.year);
      const m = metric.match(/^(.*?)\s+as\s+(\w+)\s*$/i);
      const expr = m ? m[1].trim() : metric.trim();
      const alias = m ? m[2].trim() : "total";
      let sql = `SELECT "${opts.groupBy}", ${expr} AS ${alias} FROM "${rid}"`;
      const w = translateWhere(opts.where);
      if (w) sql += ` WHERE ${w}`;
      sql += ` GROUP BY "${opts.groupBy}" ORDER BY ${alias} DESC LIMIT ${limit}`;
      const res = await ckanGet<{ records: AggregateRow[] }>("/datastore_search_sql", {
        sql,
      });
      return { total_count: res.records.length, records: res.records };
    },
  );
}

export async function crimeHotspots(opts: {
  year?: number;
  alcaldia?: string;
  category?: string;
  topN?: number;
}): Promise<{ total_count: number; records: AggregateRow[] }> {
  const year = opts.year ?? 2025;
  const wh: string[] = [`anio_hecho=${year}`];
  if (opts.alcaldia) wh.push(`alcaldia_hecho="${opts.alcaldia.toUpperCase()}"`);
  if (opts.category) wh.push(`categoria_delito="${opts.category.toUpperCase()}"`);
  return aggregate({
    datasetId: "fgj",
    groupBy: opts.alcaldia ? "colonia_hecho" : "alcaldia_hecho",
    metric: "count(*) as delitos",
    where: wh.join(" AND "),
    limit: opts.topN ?? 15,
    year,
  });
}

/**
 * SIMAT "Índice de la Calidad del aire" uses a wide-table layout: there is
 * no `zona` column; instead each zone has prefixed pollutant columns like
 * `Noroeste PM10`, `Centro Ozono`, etc. The date column is `Fecha`
 * (capital F, timestamp). This helper returns the most recent non-null
 * PM10 reading for the requested zone, normalized so the caller can treat
 * it as `{ records: [{ zona, Fecha, pm10, o3, no2, so2, co }] }`.
 */
export async function airQualityNow(zone?: string, limit = 1) {
  // Zone names in SIMAT use title case: "Noroeste", "Centro", etc.
  const zoneTitle = (zone ?? "CENTRO")
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_m, p1, p2) => p1 + p2.toUpperCase());
  const pollutantCols = {
    o3: `${zoneTitle} Ozono`,
    so2: `${zoneTitle} dioxido de azufre`,
    no2: `${zoneTitle} dioxido de nitrogeno`,
    co: `${zoneTitle} monoxido de carbono`,
    pm10: `${zoneTitle} PM10`,
  };
  const pm10Col = pollutantCols.pm10;

  const rid = await resourceFor(KNOWN_DATASETS.aire);
  const quoted = (c: string) => `"${c}"`;
  const cols = Object.values(pollutantCols).map(quoted).join(", ");
  const sql =
    `SELECT "Fecha", ${cols} FROM "${rid}" ` +
    `WHERE ${quoted(pm10Col)} IS NOT NULL ` +
    `ORDER BY "Fecha" DESC LIMIT ${Math.max(1, Math.min(50, limit))}`;

  try {
    const res = await ckanGet<{ records: Record<string, unknown>[] }>(
      "/datastore_search_sql",
      { sql },
    );
    const records = (res.records ?? []).map((r) => ({
      zona: zoneTitle.toUpperCase(),
      Fecha: r["Fecha"],
      fecha: r["Fecha"], // legacy alias
      pm10: Number(r[pollutantCols.pm10]) || null,
      o3: Number(r[pollutantCols.o3]) || null,
      so2: Number(r[pollutantCols.so2]) || null,
      no2: Number(r[pollutantCols.no2]) || null,
      co: Number(r[pollutantCols.co]) || null,
    }));
    return {
      total_count: records.length,
      returned: records.length,
      records,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[airQualityNow] SQL failed for zone=${zoneTitle}: ${msg.slice(0, 180)}`);
    throw e;
  }
}
