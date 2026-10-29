import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, Card, EmptyState, SectionHeader, Sticker, Toggle } from "@/components/brut";
import { DiscoveryCard } from "@/components/DiscoveryCard";
import { getPopular, getRecommended, needsMetadata, refreshFeedMetadata, submitAnonymous, type DiscoveryFeed } from "@/lib/discovery";
import { feedKey } from "@/lib/url";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Discover — READLY" },
      { name: "description", content: "Find new blogs from anonymous reader submissions and popularity." },
      { property: "og:title", content: "Discover — READLY" },
      { property: "og:description", content: "Find new blogs from anonymous reader submissions and popularity." },
    ],
  }),
  component: Discover,
});

function Grid({ feeds, emptyTitle, emptyBody }: { feeds: DiscoveryFeed[]; emptyTitle: string; emptyBody: string }) {
  if (!feeds.length) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {feeds.map((f) => (
        <DiscoveryCard key={f.url} feed={f} />
      ))}
    </div>
  );
}

function Discover() {
  const { feeds, settings, updateSettings } = useStore();
  const [popular, setPopular] = useState<DiscoveryFeed[] | null>(null);
  const [recs, setRecs] = useState<DiscoveryFeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const followed = useMemo(() => new Set(feeds.map((f) => feedKey(f.url))), [feeds]);
  const urls = useMemo(() => feeds.map((f) => f.url), [feeds]);
  const urlsKey = urls.join("\n");
  const tried = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.onboarded) return;
    let alive = true;
    setError(null);
    getPopular()
      .then((list) => alive && setPopular(list))
      .catch((e) => { if (alive) { setError(e.message); setPopular([]); } });
    if (settings.sharing && urls.length)
      getRecommended(urls)
        .then((list) => alive && setRecs(list))
        .catch(() => alive && setRecs([]));
    else setRecs(null);
    return () => {
      alive = false;
    };
  }, [settings.onboarded, settings.sharing, urlsKey]);

  // Any card still missing its title or newest post gets those from the blog's own feed.
  useEffect(() => {
    if (!popular) return;
    const missing = popular.filter((f) => !tried.current.has(f.url) && needsMetadata(f));
    if (!missing.length) return;
    missing.forEach((f) => tried.current.add(f.url));
    let alive = true;
    void refreshFeedMetadata(missing).then((n) => {
      if (n && alive) void getPopular(true).then(setPopular).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, [popular]);

  const shown = (popular ?? []).filter((f) => !followed.has(feedKey(f.url)));

  return (
    <div className="space-y-10">
      {!settings.onboarded && <Callout title="Finish the welcome screen first">Discover opens once you have added your first feeds.</Callout>}

      {error && <Callout tone="pink" title="Discover is offline">{error}</Callout>}

      <section>
        <SectionHeader tone="pink" right={<span className="font-display text-sm">{shown.length}</span>}>
          Most submitted
        </SectionHeader>
        {error && !popular?.length ? null : popular === null ? (
          <EmptyState title="CHECKING…" body="Loading what readers have been submitting." />
        ) : (
          <Grid
            feeds={shown}
            emptyTitle="NOTHING SUBMITTED YET"
            emptyBody="This list only grows when readers turn on anonymous sharing and submit the blogs they follow."
          />
        )}
      </section>

      {settings.sharing ? (
        <section>
          <SectionHeader tone="sage">Recommended for you</SectionHeader>
          <p className="mb-4 text-sm">Blogs that are often submitted alongside the ones you already follow.</p>
          {recs === null ? (
            <EmptyState title="CHECKING…" body="Comparing your subscriptions with other submissions." />
          ) : (
            <Grid
              feeds={recs.filter((f) => !followed.has(feedKey(f.url)))}
              emptyTitle="NOTHING NEW TO SUGGEST"
              emptyBody="Recommendations need several readers submitting the same blogs. Keep sharing, or browse the list above."
            />
          )}
        </section>
      ) : (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl uppercase">Turn on anonymous sharing</h3>
              <p className="mt-1 text-sm">Share your feed URLs (nothing else) to unlock recommendations and help others find these blogs.</p>
            </div>
            <Toggle checked={settings.sharing} onChange={(v) => void updateSettings({ sharing: v })} label="Anonymous sharing" />
          </div>
          <Button
            onClick={async () => {
              setBusy(true);
              try {
                const r = await submitAnonymous(urls);
                updateSettings({ lastShared: Date.now() });
                setRecs(await getRecommended(urls));
                setPopular(await getPopular());
                setError(null);
                alert(`Shared ${r.accepted} feed URLs. Thank you.`);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            disabled={!settings.sharing || busy || !urls.length}
          >
            {busy ? "Submitting…" : "Submit my subscriptions now"}
          </Button>
        </Card>
      )}

      <div className="flex justify-center">
        <Sticker tone="ink" rotate={-1}>
          NO ACCOUNTS · NO HISTORY · ONLY FEED URLS
        </Sticker>
      </div>
    </div>
  );
}
