type Entry = { expires: number; value: unknown };

const STORE = new Map<string, Entry>();

function hashKey(ns: string, params: unknown): string {
  return `${ns}:${JSON.stringify(params)}`;
}

export async function cached<T>(
  ns: string,
  params: unknown,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const key = hashKey(ns, params);
  const now = Date.now();
  const hit = STORE.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await producer();
  STORE.set(key, { expires: now + ttlSeconds * 1000, value });
  return value;
}

export function cacheStats() {
  return { entries: STORE.size };
}
