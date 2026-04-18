import { cached } from "./cache";

const PLACES_BASE = "https://places.googleapis.com/v1/places:searchText";

export type ResolvedLocation = {
  lat: number;
  lng: number;
  formattedAddress: string;
  colonia?: string;
  alcaldia?: string;
  placeId?: string;
  confidence: "high" | "medium" | "low";
  source: "places" | "nominatim" | "latlng" | "gmaps-url";
};

const LATLNG_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

export async function resolveLocation(query: string): Promise<ResolvedLocation> {
  const raw = query.trim();
  if (!raw) throw new Error("Empty query");

  // Case 1: raw lat,lng
  const m = raw.match(LATLNG_RE);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    const rev = await reverseGeocode(lat, lng);
    return {
      lat,
      lng,
      formattedAddress: rev?.formattedAddress ?? `${lat}, ${lng}`,
      colonia: rev?.colonia,
      alcaldia: rev?.alcaldia,
      confidence: "high",
      source: "latlng",
    };
  }

  // Case 2: Google Maps URL (full or shortened)
  if (/https?:\/\/(www\.)?(google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(raw)) {
    const coords = await extractCoordsFromGmapsUrl(raw);
    if (coords) {
      const rev = await reverseGeocode(coords.lat, coords.lng);
      return {
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: rev?.formattedAddress ?? `${coords.lat}, ${coords.lng}`,
        colonia: rev?.colonia,
        alcaldia: rev?.alcaldia,
        confidence: "high",
        source: "gmaps-url",
      };
    }
    // If no coords in URL, fall through to text search using whatever we pulled out.
  }

  // Case 3: free text → Google Places searchText API
  const placesResult = await placesSearchText(raw);
  if (placesResult) {
    const rev = await reverseGeocode(placesResult.lat, placesResult.lng).catch(() => null);
    return {
      lat: placesResult.lat,
      lng: placesResult.lng,
      formattedAddress: placesResult.formattedAddress,
      colonia: rev?.colonia,
      alcaldia: rev?.alcaldia,
      placeId: placesResult.placeId,
      confidence: "high",
      source: "places",
    };
  }

  // Case 4: Nominatim fallback
  const nom = await nominatimSearch(raw);
  if (nom) {
    return {
      lat: nom.lat,
      lng: nom.lng,
      formattedAddress: nom.formattedAddress,
      colonia: nom.colonia,
      alcaldia: nom.alcaldia,
      confidence: "medium",
      source: "nominatim",
    };
  }

  throw new Error(`Could not resolve location: "${raw}"`);
}

async function placesSearchText(
  query: string,
): Promise<{ lat: number; lng: number; formattedAddress: string; placeId: string } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  return cached("places.text", { q: query }, 86400, async () => {
    const r = await fetch(PLACES_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: `${query} Ciudad de México`,
        languageCode: "es-MX",
        regionCode: "MX",
        maxResultCount: 1,
      }),
    });
    if (!r.ok) return null;
    const body = (await r.json()) as {
      places?: {
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }[];
    };
    const p = body.places?.[0];
    if (!p || !p.location) return null;
    return {
      lat: p.location.latitude,
      lng: p.location.longitude,
      formattedAddress: p.formattedAddress ?? p.displayName?.text ?? query,
      placeId: p.id,
    };
  });
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ formattedAddress: string; colonia?: string; alcaldia?: string } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  return cached("places.reverse", { lat, lng }, 86400, async () => {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("language", "es");
    url.searchParams.set("region", "mx");
    url.searchParams.set("key", key);
    const r = await fetch(url);
    if (!r.ok) return null;
    const body = (await r.json()) as {
      results?: {
        formatted_address: string;
        address_components: { long_name: string; short_name: string; types: string[] }[];
      }[];
    };
    const first = body.results?.[0];
    if (!first) return null;
    let colonia: string | undefined;
    let alcaldia: string | undefined;
    for (const c of first.address_components) {
      if (c.types.includes("sublocality") || c.types.includes("neighborhood")) {
        colonia = colonia ?? c.long_name;
      }
      if (
        c.types.includes("administrative_area_level_3") ||
        c.types.includes("sublocality_level_1")
      ) {
        alcaldia = alcaldia ?? c.long_name;
      }
      if (c.types.includes("administrative_area_level_1") && !alcaldia) {
        alcaldia = c.long_name;
      }
    }
    return { formattedAddress: first.formatted_address, colonia, alcaldia };
  });
}

async function nominatimSearch(
  query: string,
): Promise<{ lat: number; lng: number; formattedAddress: string; colonia?: string; alcaldia?: string } | null> {
  return cached("nominatim.text", { q: query }, 86400, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${query}, Ciudad de México, México`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    const r = await fetch(url, {
      headers: { "User-Agent": "zonamatch-cdmx/0.1 (impact-lab-cdmx)" },
    });
    if (!r.ok) return null;
    const body = (await r.json()) as {
      lat: string;
      lon: string;
      display_name: string;
      address?: { suburb?: string; neighbourhood?: string; city_district?: string; municipality?: string };
    }[];
    const hit = body[0];
    if (!hit) return null;
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      formattedAddress: hit.display_name,
      colonia: hit.address?.suburb ?? hit.address?.neighbourhood,
      alcaldia: hit.address?.city_district ?? hit.address?.municipality,
    };
  });
}

async function extractCoordsFromGmapsUrl(
  urlStr: string,
): Promise<{ lat: number; lng: number } | null> {
  let expanded = urlStr;
  // Follow redirects for shortened links
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(urlStr)) {
    try {
      const r = await fetch(urlStr, { redirect: "follow" });
      expanded = r.url;
    } catch {
      return null;
    }
  }
  // Pattern 1: /@lat,lng,zoom
  const atMatch = expanded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  // Pattern 2: !3dlat!4dlng (place pins)
  const placeMatch = expanded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placeMatch) return { lat: Number(placeMatch[1]), lng: Number(placeMatch[2]) };
  // Pattern 3: ?q=lat,lng
  const qMatch = expanded.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  return null;
}
