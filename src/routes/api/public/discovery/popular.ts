import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discovery/popular")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("discovery_feeds")
          .select("url,title,description,site_url,latest_post,subscriber_count,enriched_at")
          .not("title", "is", null)
          .order("subscriber_count", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(40);
        if (error) return Response.json({ error: "failed" }, { status: 500 });
        return Response.json({ feeds: data ?? [] }, { headers: { "cache-control": "public, max-age=300" } });
      },
    },
  },
});
