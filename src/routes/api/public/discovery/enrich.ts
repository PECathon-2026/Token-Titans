import { createFileRoute } from "@tanstack/react-router";
import { cleanEnrichment } from "@/lib/discovery-rules";

const MAX_PER_DAY = 60;
const FRESH_MS = 7 * 24 * 3600_000;

async function hashIp(ip: string) {
  const salt = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`enrich:${salt}:${ip}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/discovery/enrich")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }
        const patch = cleanEnrichment(body);
        if (!patch) return Response.json({ error: "feed details rejected" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ip = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
        const ipHash = await hashIp(ip);

        const since = new Date(Date.now() - 86_400_000).toISOString();
        const { count } = await supabaseAdmin
          .from("submission_rate_limits")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", since);
        if ((count ?? 0) >= MAX_PER_DAY) return Response.json({ error: "rate limited" }, { status: 429 });

        // Only blogs the catalogue already holds can be described, and only once a week.
        const { data: row, error: readErr } = await supabaseAdmin
          .from("discovery_feeds")
          .select("url,enriched_at")
          .eq("url", patch.url)
          .maybeSingle();
        if (readErr) return Response.json({ error: "could not read feed" }, { status: 500 });
        if (!row) return Response.json({ error: "unknown feed" }, { status: 404 });

        const at = row.enriched_at ? Date.parse(row.enriched_at) : NaN;
        if (Number.isFinite(at) && Date.now() - at < FRESH_MS) return Response.json({ ok: true, updated: false });

        const now = new Date().toISOString();
        const changes: {
          enriched_at: string;
          updated_at: string;
          title?: string;
          description?: string;
          site_url?: string;
          latest_post?: string;
        } = { enriched_at: now, updated_at: now };
        if (patch.title) changes.title = patch.title;
        if (patch.description) changes.description = patch.description;
        if (patch.site_url) changes.site_url = patch.site_url;
        if (patch.latest_post) changes.latest_post = patch.latest_post;

        const { error } = await supabaseAdmin.from("discovery_feeds").update(changes).eq("url", patch.url);
        if (error) return Response.json({ error: "could not save" }, { status: 500 });
        await supabaseAdmin.from("submission_rate_limits").insert({ ip_hash: ipHash });
        return Response.json({ ok: true, updated: true });
      },
    },
  },
});
