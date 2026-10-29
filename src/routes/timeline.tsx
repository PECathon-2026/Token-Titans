import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Checkbox, EmptyState, SectionHeader, SkeletonBar, Sticker } from "@/components/brut";
import { PostCard } from "@/components/PostCard";
import { useAddFeed } from "@/components/AddFeedModal";
import { useStore } from "@/lib/store";
import { SEED_BLOGS } from "@/lib/seeds";
import { stripHtml } from "@/lib/feeds";

export const Route = createFileRoute("/timeline")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Timeline — READLY" },
      { name: "description", content: "Your unified chronological timeline of posts from independent blogs." },
      { property: "og:title", content: "Timeline — READLY" },
      { property: "og:description", content: "Your unified chronological timeline of posts from independent blogs." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const { q } = Route.useSearch();
  const { ready, feeds, posts, markAllRead, subscribe, settings } = useStore();
  const addFeed = useAddFeed();
  const [feedFilter, setFeedFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(50);
  const feedMap = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const broken = feeds.filter((f) => f.health === "DEAD" || f.health === "MALFORMED");

  const shown = useMemo(() => {
    const ql = q?.toLowerCase();
    return posts.filter(
      (p) =>
        feedMap.has(p.feedId) &&
        (feedFilter === "all" || p.feedId === feedFilter) &&
        (!unreadOnly || !p.read) &&
        (!ql || p.title.toLowerCase().includes(ql) || stripHtml(p.summary).toLowerCase().includes(ql)),
    );
  }, [posts, feedMap, feedFilter, unreadOnly, q]);

  if (!ready)
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBar key={i} className={i % 2 ? "h-28 bg-pink" : "h-28 bg-sage-light"} />
        ))}
      </div>
    );

  if (!feeds.length)
    return (
      <EmptyState title="NO FEEDS YET" body="Follow independent writers. Posts show up here, newest first.">
        <Button size="lg" onClick={() => addFeed()}>
          + Add a feed
        </Button>
        <Button
          size="lg"
          variant="pink"
          onClick={async () => {
            for (const b of SEED_BLOGS) await subscribe(b.url, { title: b.title, tags: [b.tag], quiet: true });
            toast.success(`Added ${SEED_BLOGS.length} starter blogs`);
          }}
        >
          Load starter blogs
        </Button>
      </EmptyState>
    );

  const sinceSync = settings.lastSynced ?? 0;

  return (
    <div>
      <SectionHeader right={<span className="font-display text-sm">{shown.length} posts</span>}>{q ? `Search: “${q}”` : "Timeline"}</SectionHeader>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select value={feedFilter} onChange={(e) => setFeedFilter(e.target.value)} className="brut h-10 bg-cream px-2 font-display text-xs uppercase" aria-label="Filter by feed">
          <option value="all">All feeds</option>
          {feeds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <Checkbox checked={unreadOnly} onChange={setUnreadOnly} label="Unread only" />
        <Button size="sm" variant="sage" className="ml-auto" onClick={() => void markAllRead(feedFilter === "all" ? undefined : feedFilter)}>
          ✓ Mark all read
        </Button>
        {q && (
          <Link to="/timeline" search={{}} className="underline">
            Clear search
          </Link>
        )}
      </div>
      {broken.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {broken.map((f) => (
            <Link key={f.id} to="/feed/$id" params={{ id: f.id }}>
              <Sticker tone="danger">
                {f.health === "DEAD" ? "DEAD FEED" : "MALFORMED"}: {f.title}
              </Sticker>
            </Link>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState title={unreadOnly ? "ALL CAUGHT UP" : "NOTHING HERE"} body={feeds.some((f) => f.health === "PENDING") ? "Feeds are loading — posts will appear in a moment." : "Try another filter or refresh."} />
      ) : (
        <div className="space-y-5">
          {shown.slice(0, limit).map((p) => (
            <PostCard key={p.id} post={p} feed={feedMap.get(p.feedId)} isNew={p.date > sinceSync - 86_400_000} />
          ))}
          {shown.length > limit && (
            <Button variant="secondary" className="w-full" onClick={() => setLimit((l) => l + 50)}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
