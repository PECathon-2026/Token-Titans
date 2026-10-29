import { createFileRoute } from "@tanstack/react-router";
import { isBlockedHost, isPrivateIp } from "@/lib/url";

// Raw fetch proxy: returns upstream bytes only. Never parses or stores content.
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 4;

async function resolvesPrivate(host: string): Promise<boolean> {
  if (/^[\d.]+$/.test(host) || host.includes(":")) return isPrivateIp(host);
  for (const type of ["A", "AAAA"]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
      });
      const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
      for (const a of j.Answer ?? []) if ((a.type === 1 || a.type === 28) && isPrivateIp(a.data)) return true;
    } catch {
      /* ignore lookup failure; fetch will fail on its own */
    }
  }
  return false;
}

function err(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "x-proxy-error": message } });
}

export const Route = createFileRoute("/api/public/fetch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url");
        if (!target || target.length > 2048) return err(400, "missing url");
        let url: URL;
        try {
          url = new URL(target);
        } catch {
          return err(400, "invalid url");
        }
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
          let res: Response | null = null;
          for (let i = 0; i <= MAX_REDIRECTS; i++) {
            if (url.protocol !== "http:" && url.protocol !== "https:") return err(400, "only http(s)");
            if (isBlockedHost(url.hostname) || (await resolvesPrivate(url.hostname))) return err(403, "blocked address");
            res = await fetch(url.toString(), {
              redirect: "manual",
              signal: ctrl.signal,
              headers: { "user-agent": "Readly/1.0 (+feed reader)", accept: "application/rss+xml, application/atom+xml, application/xml, text/html;q=0.9, */*;q=0.8" },
            });
            const loc = res.headers.get("location");
            if (res.status >= 300 && res.status < 400 && loc) {
              url = new URL(loc, url);
              continue;
            }
            break;
          }
          if (!res) return err(502, "no response");
          const len = Number(res.headers.get("content-length") ?? 0);
          if (len > MAX_BYTES) return err(413, "too large");
          const reader = res.body?.getReader();
          const chunks: Uint8Array[] = [];
          let total = 0;
          if (reader) {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              total += value.byteLength;
              if (total > MAX_BYTES) {
                await reader.cancel();
                return err(413, "too large");
              }
              chunks.push(value);
            }
          }
          const body = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) {
            body.set(c, off);
            off += c.byteLength;
          }
          return new Response(body, {
            status: 200,
            headers: {
              "content-type": res.headers.get("content-type") ?? "application/octet-stream",
              "x-upstream-status": String(res.status),
              "x-final-url": url.toString(),
              "cache-control": "no-store",
            },
          });
        } catch (e) {
          return err(504, ctrl.signal.aborted ? "timeout" : "fetch failed");
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
