import { createFileRoute } from "@tanstack/react-router";
import { normalizeUrl } from "@/lib/url";

export const Route = createFileRoute("/api/public/discovery/recommend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { urls?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }
        if (!Array.isArray(body.urls) || body.urls.length > 200) return Response.json({ error: "urls[] required" }, { status: 400 });
        const followed = body.urls
          .filter((u): u is string => typeof u === "string" && u.length < 2048)
          .map((u) => normalizeUrl(u))
          .filter((u): u is string => !!u);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("recommend_feeds", { followed, lim: 12 });
        if (error) return Response.json({ error: "failed" }, { status: 500 });
        return Response.json({ feeds: data ?? [] });
      },
    },
  },
});
