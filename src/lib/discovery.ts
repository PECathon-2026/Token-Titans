import { cleanEnrichment, isRedundantDescription, submissionLabel, type FeedEnrichment } from "./discovery-rules";
import { parseFeed, proxyFetch } from "./feeds";

export interface DiscoveryFeed {
  url: string;
  title: string | null;
  description: string | null;
  site_url: string | null;
  latest_post: string | null;
  subscriber_count: number;
  because?: string | null;
  enriched_at?: string | null;
}

export { isRedundantDescription, submissionLabel };

/** `fresh` skips the browser's 5-minute copy so a just-refilled card can show up. */
const POPULAR_KEY = "readly-discover-popular";

/** Latest list from the server; offline, the last list seen on this device (or an error). */
export async function getPopular(fresh = false): Promise<DiscoveryFeed[]> {
  try {
    const r = await fetch("/api/public/discovery/popular", { cache: fresh ? "no-store" : "default" });
    if (!r.ok) throw new Error("Could not load popular feeds");
    const feeds: DiscoveryFeed[] = (await r.json()).feeds;
    try { localStorage.setItem(POPULAR_KEY, JSON.stringify(feeds)); } catch { /* storage full */ }
    return feeds;
  } catch (e) {
    try {
      const saved = localStorage.getItem(POPULAR_KEY);
      if (saved) return JSON.parse(saved) as DiscoveryFeed[];
    } catch { /* ignore */ }
    throw new Error(typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. Discover needs internet the first time; your feeds and saved articles still work." : (e as Error).message);
  }
}

export async function getRecommended(urls: string[]): Promise<DiscoveryFeed[]> {
  const r = await fetch("/api/public/discovery/recommend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls }) });
  if (!r.ok) throw new Error("Could not load recommendations");
  return (await r.json()).feeds;
}

export async function submitAnonymous(urls: string[]) {
  const r = await fetch("/api/public/discovery/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: urls.slice(0, 50) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Submit failed");
  return j as { accepted: number };
}

/** Save details read from a feed's own file, so the catalogue never shows invented text. */
export async function enrichFeed(patch: FeedEnrichment) {
  const r = await fetch("/api/public/discovery/enrich", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Could not save feed details");
  return j as { ok: boolean; updated: boolean };
}

const STALE_MS = 7 * 24 * 3600_000;

/** Broken template text some generators emit ("Recent content on " with nothing after it). */
function isTemplateFragment(s: string) {
  return /^(recent|all|latest)?\s*(content|posts|articles|feed)\s*(on|for|of)?$/i.test(s.trim());
}

/** A card still needs details when it has no title or newest post, or they are over a week old. */
export function needsMetadata(f: DiscoveryFeed): boolean {
  if (!f.title || !f.latest_post) return true;
  const at = f.enriched_at ? Date.parse(f.enriched_at) : NaN;
  return !Number.isFinite(at) || Date.now() - at > STALE_MS;
}

/**
 * Fill a card's title, tagline and newest post from the blog's own feed, using the
 * same parser the reading view uses. Best effort: a blog that refuses us is left as is.
 */
export async function refreshFeedMetadata(items: DiscoveryFeed[], limit = 6): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  const targets = items.filter(needsMetadata).slice(0, limit);
  let done = 0;
  await Promise.all(
    targets.map(async (f) => {
      try {
        const res = await proxyFetch(f.url);
        const parsed = parseFeed(res.text, res.finalUrl);
        const host = new URL(f.url).hostname.replace(/^www\./, "");
        const rawTitle = parsed.title.trim();
        const title = !rawTitle || rawTitle === res.finalUrl || rawTitle === f.url || /\.(xml|rss)$/i.test(rawTitle) ? host : rawTitle;
        const patch = cleanEnrichment({
          url: f.url,
          title,
          description: parsed.description && !isTemplateFragment(parsed.description) ? parsed.description : null,
          site_url: parsed.siteUrl,
          latest_post: parsed.items[0]?.title ?? null,
        });
        if (!patch) return;
        const r = await enrichFeed(patch);
        if (r.updated) done++;
      } catch {
        /* leave this card as it is */
      }
    }),
  );
  return done;
}
