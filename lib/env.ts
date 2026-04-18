/**
 * Reliable env accessor.
 *
 * Problem: the parent shell (Claude Code / other wrappers) can export
 * `ANTHROPIC_API_KEY=` empty. Next.js gives OS env precedence over
 * `.env.local`, so `process.env.ANTHROPIC_API_KEY` ends up as "" and the
 * app silently falls back. To avoid relying on shell hygiene, we re-read
 * `.env.local` once per process on first call and fill in anything that
 * is missing or empty in `process.env`.
 */

import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

let hydrated = false;

function hydrateFromDotenv() {
  if (hydrated) return;
  hydrated = true;
  // cwd during `next dev` is the project root
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    let contents: string;
    try {
      contents = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      // strip matching surrounding quotes if present
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      const existing = process.env[k];
      if (!existing || existing.length === 0) {
        process.env[k] = v;
      }
    }
  }
}

export function env(key: string): string | undefined {
  hydrateFromDotenv();
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export function requiredEnv(key: string): string {
  const v = env(key);
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}
