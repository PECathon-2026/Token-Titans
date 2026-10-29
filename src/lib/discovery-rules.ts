import { isBlockedHost, normalizeUrl } from "./url";

export const MAX_SUBMIT_URLS = 50;

/** Validate & normalize an anonymous submission batch. Returns null if invalid. */
export function cleanSubmission(urls: unknown): string[] | null {
  if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_SUBMIT_URLS) return null;
  const out = new Set<string>();
  for (const u of urls) {
    if (typeof u !== "string" || u.length > 2048) return null;
    const n = normalizeUrl(u);
    if (!n) return null;
    if (isBlockedHost(new URL(n).hostname)) return null;
    out.add(n);
  }
  return [...out];
}

/**
 * What a feed's tally really means: how many times readers have submitted it.
 * Returns null when nobody has submitted it yet, so the UI can show no number
 * rather than a made-up one.
 */
export function submissionLabel(count: number): string | null {
  if (!Number.isFinite(count) || count < 1) return null;
  const n = Math.trunc(count);
  return n === 1 ? "SUBMITTED ONCE" : `SUBMITTED ${n} TIMES`;
}

export interface FeedEnrichment {
  url: string;
  title: string | null;
  description: string | null;
  site_url: string | null;
  latest_post: string | null;
}

const CAPS = { title: 160, description: 400, latest_post: 300 } as const;

function text(value: unknown, cap: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > cap ? `${t.slice(0, cap - 1).trimEnd()}…` : t;
}

/** True when a tagline adds nothing the name doesn't already say ("Julia Evans", "X's blog - Blog"). */
export function isRedundantDescription(description: string, title: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[\s.\-–—]+$/g, "").trim();
  const d = norm(description);
  const t = norm(title);
  if (!d || !t) return false;
  return d === t || d.startsWith(`${t} -`) || d.startsWith(`${t} –`);
}

/**
 * Validate a metadata patch for a feed the catalogue already holds. Feed URL must
 * be a real http(s) address; every text field is capped plain text; at least one
 * field must carry something. Returns null when the patch is not trustworthy.
 */
export function cleanEnrichment(input: unknown): FeedEnrichment | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { url?: unknown; title?: unknown; description?: unknown; site_url?: unknown; latest_post?: unknown };
  if (typeof raw.url !== "string" || raw.url.length > 2048) return null;
  const url = normalizeUrl(raw.url);
  if (!url || isBlockedHost(new URL(url).hostname)) return null;
  const out: FeedEnrichment = {
    url,
    title: text(raw.title, CAPS.title),
    description: text(raw.description, CAPS.description),
    site_url: typeof raw.site_url === "string" ? normalizeUrl(raw.site_url) : null,
    latest_post: text(raw.latest_post, CAPS.latest_post),
  };
  if (out.description && out.title && isRedundantDescription(out.description, out.title)) out.description = null;
  if (!out.title && !out.description && !out.latest_post) return null;
  return out;
}
