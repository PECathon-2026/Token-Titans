import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, buttonVariants, Card, EmptyState, Favicon, HealthSticker, SectionHeader } from "@/components/brut";
import { PostCard } from "@/components/PostCard";
import { DiscoveryCard } from "@/components/DiscoveryCard";
import { getRecommended, type DiscoveryFeed } from "@/lib/discovery";
import { timeAgo, useStore } from "@/lib/store";
import { feedKey } from "@/lib/url";

export const Route = createFileRoute("/feed/$id")({
  head: () => ({
    meta: [
      { title: "Feed — READLY" },
      { name: "description", content: "Posts from one feed, plus blogs like it." },
      { property: "og:title", content: "Feed — READLY" },
      { property: "og:description", content: "Posts from one feed, plus blogs like it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedDetail,
});

function FeedDetail() {
  const { id } = Route.useParams();
  const { ready, feeds, posts, unsubscribe, refreshFeed, markAllRead } = useStore();
  const navigate = useNavigate();
  const feed = feeds.find((f) => f.id === id);
  const [similar, setSimilar] = useState<DiscoveryFeed[] | null>(null);

  useEffect(() => {
    if (!feed) return;
    const followed = new Set(feeds.map((f) => feedKey(f.url)));
    getRecommended([feed.url])
      .then((r) => setSimilar(r.filter((x) => !followed.has(feedKey(x.url))).slice(0, 6)))
      .catch(() => setSimilar([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed?.url]);

  if (!ready) return null;
  if (!feed)
    return (
      <EmptyState title="FEED NOT FOUND" body="You may have unsubscribed.">
        <Link to="/subscriptions" className={buttonVariants()}>
          Subscriptions
        </Link>
      </EmptyState>
    );
  const list = posts.filter((p) => p.feedId === id);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b-[3px] border-ink bg-pink p-4 sm:p-6 xl:flex-row xl:items-center">
        {feed.siteUrl && <Favicon siteUrl={feed.siteUrl} className="h-12 w-12 border-[3px] border-ink bg-cream" />}
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl sm:text-3xl md:text-4xl">{feed.title}</h1>
          <a href={feed.siteUrl || feed.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm underline">
            {feed.siteUrl || feed.url}
          </a>
          <p className="mt-1 text-xs">
            Fetched {timeAgo(feed.lastFetched)} {feed.lastError && `· ${feed.lastError}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HealthSticker health={feed.health} />
          <Button size="sm" variant="sage" onClick={() => void refreshFeed(feed.id)}>
            ↻ Retry
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void markAllRead(feed.id)}>
            Mark read
          </Button>
          <Button
            size="sm"
            variant="ink"
            onClick={async () => {
              if (!confirm(`Unsubscribe from ${feed.title}?`)) return;
              await unsubscribe(feed.id);
              navigate({ to: "/subscriptions" });
            }}
          >
            Unsubscribe
          </Button>
        </div>
      </header>

      <section>
        <SectionHeader right={<span className="font-display text-sm">{list.length}</span>}>Posts</SectionHeader>
        {list.length ? (
          <div className="space-y-5">
            {list.map((p) => (
              <PostCard key={p.id} post={p} feed={feed} />
            ))}
          </div>
        ) : (
          <EmptyState title="NO POSTS YET" body={feed.health === "PENDING" ? "Fetching…" : "This feed hasn't delivered any posts."} />
        )}
      </section>

      {similar && similar.length > 0 && (
        <section>
          <SectionHeader tone="sage">Blogs like this</SectionHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <DiscoveryCard key={s.url} feed={s} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
