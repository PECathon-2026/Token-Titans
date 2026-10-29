import { createFileRoute } from "@tanstack/react-router";
import { cleanSubmission } from "@/lib/discovery-rules";

const MAX_PER_DAY = 5;

async function hashIp(ip: string) {
  // Daily rotating salt: hashes can't be linked across days, and rows expire after 24h.
  const salt = (process.env["SUPABASE_URL"] ?? "swr") + new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/discovery/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }
        const urls = cleanSubmission((body as { urls?: unknown })?.urls);
        if (!urls) return Response.json({ error: "1–50 public http(s) URLs required" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
        const ipHash = await hashIp(ip);
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const { count } = await supabaseAdmin
          .from("submission_rate_limits")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", since);
        if ((count ?? 0) >= MAX_PER_DAY) return Response.json({ error: "rate limited, try tomorrow" }, { status: 429 });

        await supabaseAdmin.from("submission_rate_limits").insert({ ip_hash: ipHash });
        const { error } = await supabaseAdmin.rpc("submit_feed_batch", { urls });
        if (error) return Response.json({ error: "could not save" }, { status: 500 });
        return Response.json({ ok: true, accepted: urls.length });
      },
    },
  },
});
