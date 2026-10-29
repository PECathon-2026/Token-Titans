// Browser-side feed handling: proxy fetch, autodiscovery, RSS/Atom parsing.
import { normalizeUrl } from "./url";
import { webUrl } from "./content";

export class FetchError extends Error {
  constructor(public kind: "DEAD" | "SLOW" | "BLOCKED" | "INVALID", message: string) {
    super(message);
  }
}

export interface ProxyResult {
  text: string;
  contentType: string;
  status: number;
  finalUrl: string;
  ms: number;
}

export async function proxyFetch(url: string, timeoutMs = 12_000): Promise<ProxyResult> {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/public/fetch?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
    if (!res.ok) {
      const msg = res.headers.get("x-proxy-error") ?? `HTTP ${res.status}`;
      if (res.status === 504) throw new FetchError("SLOW", "Site timed out");
      if (res.status === 403) throw new FetchError("BLOCKED", "Address not allowed");
      if (res.status === 400) throw new FetchError("INVALID", msg);
      throw new FetchError("DEAD", msg);
    }
    const status = Number(res.headers.get("x-upstream-status") ?? 200);
    if (status >= 400) throw new FetchError("DEAD", `Site returned ${status}`);
    return {
      text: await res.text(),
      contentType: res.headers.get("content-type") ?? "",
      status,
      finalUrl: res.headers.get("x-final-url") ?? url,
      ms: performance.now() - t0,
    };
  } catch (e) {
    if (e instanceof FetchError) throw e;
    if (ctrl.signal.aborted) throw new FetchError("SLOW", "Timed out");
    throw new FetchError("DEAD", "Network error");
  } finally {
    clearTimeout(timer);
  }
}

export interface ParsedItem {
  guid: string;
  title: string;
  link: string;
  author?: string | undefined;
  date: number;
  summary: string;
}
export interface ParsedFeed {
  title: string;
  siteUrl: string;
  description: string | null;
  items: ParsedItem[];
}

const txt = (el: Element | null | undefined) => el?.textContent?.trim() ?? "";
const child = (el: Element, name: string) =>
  Array.from(el.children).find((c) => c.localName === name || c.nodeName === name) ?? null;

function content(el: Element | null) {
  if (!el) return "";
  if (!el.children.length) return txt(el);
  return Array.from(el.childNodes).map((node) => new XMLSerializer().serializeToString(node)).join("");
}

/** Plain-text channel blurb, only when the feed actually publishes one. */
function feedDescription(...els: (Element | null | undefined)[]): string | null {
  for (const el of els) {
    const t = stripHtml(content(el ?? null)).replace(/\s+/g, " ").trim();
    if (t) return t.slice(0, 400);
  }
  return null;
}

/** Pick the richest body a feed offers (full text beats a teaser). */
function richest(...els: (Element | null | undefined)[]) {
  let best = "";
  let bestLen = -1;
  for (const el of els) {
    const html = content(el ?? null);
    const len = stripHtml(html).length;
    if (html && len > bestLen) { best = html; bestLen = len; }
  }
  return best;
}

const kids = (el: Element, ...names: string[]) =>
  Array.from(el.children).filter((c) => names.includes(c.localName));

/** Lead image from enclosure / media tags, prepended when the body has none. */
function withLeadImage(e: Element, html: string, abs: (h: string) => string) {
  if (/<img[\s>]/i.test(html)) return html;
  const media = kids(e, "enclosure", "content", "thumbnail").find((m) => {
    const type = m.getAttribute("type") ?? m.getAttribute("medium") ?? "";
    return m.getAttribute("url") && (/image/i.test(type) || m.localName === "thumbnail");
  });
  const src = media ? abs(media.getAttribute("url") ?? "") : "";
  return src ? `<p><img src="${src.replace(/"/g, "&quot;")}" alt=""></p>${html}` : html;
}

function alternateLink(el: Element) {
  return Array.from(el.children).find((c) => c.localName === "link" &&
    (c.getAttribute("rel") ?? "alternate") === "alternate" && c.getAttribute("href")?.trim());
}

export function parseFeed(xml: string, baseUrl: string): ParsedFeed {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("MALFORMED");
  const root = doc.documentElement;
  const abs = (h: string) => webUrl(h, baseUrl);
  if (root.localName === "feed") {
    const siteLink = alternateLink(root);
    const items = Array.from(root.children)
      .filter((c) => c.localName === "entry")
      .map((e) => {
        const link = alternateLink(e);
        const entryId = txt(child(e, "id"));
        const href = abs(link?.getAttribute("href") ?? (/^https?:\/\//i.test(entryId) ? entryId : ""));
        const d = Date.parse(txt(child(e, "published")) || txt(child(e, "updated")));
        return {
          guid: txt(child(e, "id")) || href,
          title: txt(child(e, "title")) || "(untitled)",
          link: href,
          author: txt(child(child(e, "author") ?? e, "name")) || undefined,
          date: isNaN(d) ? 0 : d,
          summary: withLeadImage(e, richest(child(e, "content"), child(e, "summary")), abs),
        };
      });
    return {
      title: txt(child(root, "title")) || baseUrl,
      siteUrl: abs(siteLink?.getAttribute("href") ?? baseUrl),
      description: feedDescription(child(root, "subtitle"), child(root, "tagline")),
      items,
    };
  }
  const channel = root.localName === "rss" ? child(root, "channel") : root.localName === "RDF" ? child(root, "channel") : null;
  if (!channel) throw new Error("MALFORMED");
  const itemParent = root.localName === "RDF" ? root : channel;
  const items = Array.from(itemParent.children)
    .filter((c) => c.localName === "item")
    .map((e) => {
      const linkEl = child(e, "link");
      const guidEl = child(e, "guid");
      const guid = txt(guidEl);
      const link = abs(txt(linkEl) || linkEl?.getAttribute("href") ||
        (guidEl?.getAttribute("isPermaLink") !== "false" && /^https?:\/\//i.test(guid) ? guid : ""));
      const d = Date.parse(txt(child(e, "pubDate")) || txt(child(e, "date")));
      const bodies = kids(e, "encoded", "full-text", "description");
      return {
        guid: txt(child(e, "guid")) || link,
        title: txt(child(e, "title")) || "(untitled)",
        link,
        author: txt(child(e, "creator")) || txt(child(e, "author")) || undefined,
        date: isNaN(d) ? 0 : d,
        summary: withLeadImage(e, richest(...bodies), abs),
      };
    });
  return {
    title: txt(child(channel, "title")) || baseUrl,
    siteUrl: abs(txt(child(channel, "link")) || baseUrl),
    description: feedDescription(child(channel, "description"), child(channel, "subtitle")),
    items,
  };
}

export function looksLikeFeed(text: string) {
  const head = text.slice(0, 1000);
  return /<(rss|feed|rdf:RDF)[\s>]/i.test(head);
}

export interface DiscoveredFeed {
  url: string;
  title: string;
  parsed: ParsedFeed;
}

/** Autodiscover feeds for a site or feed URL. */
export async function discoverFeeds(input: string, onStep?: (msg: string) => void): Promise<DiscoveredFeed[]> {
  const url = normalizeUrl(input);
  if (!url) throw new FetchError("INVALID", "That doesn't look like a web address");
  onStep?.("Fetching page…");
  const first = await proxyFetch(url);
  if (looksLikeFeed(first.text)) {
    const parsed = parseFeed(first.text, first.finalUrl);
    return [{ url: first.finalUrl, title: parsed.title, parsed }];
  }
  const candidates = new Set<string>();
  const doc = new DOMParser().parseFromString(first.text, "text/html");
  doc.querySelectorAll('link[rel~="alternate"]').forEach((l) => {
    const type = l.getAttribute("type") ?? "";
    const href = l.getAttribute("href");
    if (href && /rss|atom|xml/i.test(type)) candidates.add(new URL(href, first.finalUrl).toString());
  });
  const origin = new URL(first.finalUrl).origin;
  if (!candidates.size) ["/feed", "/rss.xml", "/atom.xml", "/feed.xml", "/index.xml"].forEach((p) => candidates.add(origin + p));
  onStep?.(`Checking ${candidates.size} candidate feed${candidates.size > 1 ? "s" : ""}…`);
  const results = await Promise.all(
    [...candidates].slice(0, 8).map(async (c) => {
      try {
        const r = await proxyFetch(c, 8000);
        if (!looksLikeFeed(r.text)) return null;
        const parsed = parseFeed(r.text, r.finalUrl);
        return { url: r.finalUrl, title: parsed.title, parsed };
      } catch {
        return null;
      }
    }),
  );
  const seen = new Set<string>();
  return results.filter((r): r is DiscoveredFeed => {
    if (!r || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

export function hashId(s: string) {
  let h1 = 5381,
    h2 = 52711;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = (h1 * 33) ^ c;
    h2 = (h2 * 33) ^ c;
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

export function stripHtml(html: string) {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style").forEach((el) => el.remove());
    doc.querySelectorAll("p, div, br, li, blockquote, h1, h2, h3").forEach((el) => el.append(" "));
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

export function faviconFor(siteUrl: string) {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(siteUrl).hostname}.ico`;
  } catch {
    return "";
  }
}

export function toOpml(feeds: { title: string; url: string; siteUrl: string; tags: string[] }[]) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const body = feeds
    .map((f) => `    <outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}" htmlUrl="${esc(f.siteUrl)}"${f.tags.length ? ` category="${esc(f.tags.join(","))}"` : ""}/>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>READLY subscriptions</title></head>\n  <body>\n${body}\n  </body>\n</opml>\n`;
}

export function parseOpml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Not a valid OPML file");
  return Array.from(doc.querySelectorAll("outline[xmlUrl]")).map((o) => ({
    url: o.getAttribute("xmlUrl") ?? "",
    title: o.getAttribute("title") || o.getAttribute("text") || o.getAttribute("xmlUrl") || "",
    siteUrl: o.getAttribute("htmlUrl") || "",
    tags: (o.getAttribute("category") ?? (o.parentElement?.getAttribute("xmlUrl") ? "" : o.parentElement?.getAttribute("text") ?? "")).split(",").map((t) => t.trim()).filter(Boolean),
  }));
}
