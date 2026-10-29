import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Favicon, HealthSticker, Input, SectionHeader } from "@/components/brut";
import { useAddFeed } from "@/components/AddFeedModal";
import { timeAgo, useStore } from "@/lib/store";
import { parseOpml, toOpml } from "@/lib/feeds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Subscriptions — READLY" },
      { name: "description", content: "Manage your feeds, folders, OPML import and export." },
      { property: "og:title", content: "Subscriptions — READLY" },
      { property: "og:description", content: "Manage your feeds, folders, OPML import and export." },
    ],
  }),
  component: Subscriptions,
});

const TAG_TONES = ["bg-pink", "bg-sage-light", "on-sage", "bg-cream"];

function Subscriptions() {
  const { feeds, posts, unsubscribe, refreshFeed, subscribe, setTags } = useStore();
  const addFeed = useAddFeed();
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const unread = useMemo(() => {
    const m = new Map<string, number>();
    posts.forEach((p) => !p.read && m.set(p.feedId, (m.get(p.feedId) ?? 0) + 1));
    return m;
  }, [posts]);
  const allTags = [...new Set(feeds.flatMap((f) => f.tags))].sort();
  const shown = tag ? feeds.filter((f) => f.tags.includes(tag)) : feeds;

  const exportOpml = () => {
    const blob = new Blob([toOpml(feeds)], { type: "text/x-opml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "readly.opml";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importOpml = async (file: File) => {
    try {
      const list = parseOpml(await file.text());
      let n = 0;
      for (const f of list) if ((await subscribe(f.url, { title: f.title, tags: f.tags, quiet: true })) === "added") n++;
      toast.success(`Imported ${n} feed${n === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <SectionHeader right={<span className="font-display text-sm">{feeds.length} feeds</span>}>Subscriptions</SectionHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addFeed(url);
          setUrl("");
        }}
        className="brut-lg mb-6 flex gap-3 bg-pink p-4"
      >
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a blog or feed URL" className="h-14 text-base" aria-label="Feed URL" />
        <Button size="lg" type="submit">
          ADD
        </Button>
      </form>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
          ⇪ Import OPML
        </Button>
        <Button size="sm" variant="secondary" onClick={exportOpml} disabled={!feeds.length}>
          ⇩ Export OPML
        </Button>
        <input ref={fileRef} type="file" accept=".opml,.xml,text/xml" className="hidden" onChange={(e) => e.target.files?.[0] && void importOpml(e.target.files[0])} />
        <span className="mx-2 hidden h-8 border-l-[3px] border-ink md:block" />
        <button onClick={() => setTag(null)} className={cn("brut-press border-[3px] border-ink px-3 py-1 font-display text-xs uppercase", !tag ? "bg-ink text-cream" : "bg-cream")}>
          All
        </button>
        {allTags.map((t, i) => (
          <button key={t} onClick={() => setTag(t)} className={cn("brut-press border-[3px] border-ink px-3 py-1 font-display text-xs uppercase", tag === t ? "bg-ink text-cream" : TAG_TONES[i % TAG_TONES.length])}>
            #{t}
          </button>
        ))}
      </div>
      {!feeds.length ? (
        <EmptyState title="NO FEEDS YET" body="Add one above, or import an OPML file from another reader." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {shown.map((f) => (
            <Card key={f.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                {f.siteUrl && <Favicon siteUrl={f.siteUrl} className="mt-1 h-6 w-6 border-2 border-ink" />}
                <div className="min-w-0 flex-1">
                  <Link to="/feed/$id" params={{ id: f.id }} className="block font-display text-lg uppercase leading-tight hover:underline">
                    {f.title}
                  </Link>
                  <p className="truncate text-xs">{f.siteUrl || f.url}</p>
                </div>
                <HealthSticker health={f.health} />
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>
                  <b>{unread.get(f.id) ?? 0}</b> unread
                </span>
                <span>fetched {timeAgo(f.lastFetched)}</span>
              </div>
              {f.lastError && <p className="border-l-[6px] border-danger pl-2 text-xs">{f.lastError}</p>}
              <TagEditor tags={f.tags} onChange={(t) => void setTags(f.id, t)} />
              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="sage" onClick={() => void refreshFeed(f.id)}>
                  ↻ Retry
                </Button>
                <Button size="sm" variant="secondary" onClick={() => confirm(`Unsubscribe from ${f.title}?`) && void unsubscribe(f.id)}>
                  Unsubscribe
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((t, i) => (
        <button key={t} onClick={() => onChange(tags.filter((x) => x !== t))} title="Remove tag" className={cn("border-2 border-ink px-2 text-xs", TAG_TONES[i % TAG_TONES.length])}>
          #{t} ✕
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = v.trim().toLowerCase().replace(/\s+/g, "-");
          if (t && !tags.includes(t)) onChange([...tags, t]);
          setV("");
        }}
      >
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="+ tag" aria-label="Add tag" className="w-20 border-2 border-ink bg-cream px-1 text-xs" />
      </form>
    </div>
  );
}
