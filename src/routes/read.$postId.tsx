import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants, SkeletonBar, Sticker } from "@/components/brut";
import { db, type Article } from "@/lib/db";
import { proxyFetch } from "@/lib/feeds";
import { fmtDate, useStore } from "@/lib/store";
import { sanitizeContent as sanitize, textLength, webUrl } from "@/lib/content";

export const Route = createFileRoute("/read/$postId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Reading — READLY" },
      { name: "description", content: "Distraction-free reading view, cached for offline use." },
      { property: "og:title", content: "Reading — READLY" },
      { property: "og:description", content: "Distraction-free reading view, cached for offline use." },
    ],
  }),
  component: ReadingView,
});

/** A feed body this long is treated as the complete article. */
const FULL_FEED_CHARS = 1200;

async function extract(link: string): Promise<{ html: string; byline: string | null } | null> {
  const r = await proxyFetch(link, 15_000);
  if (!/html/i.test(r.contentType) && !/<html[\s>]/i.test(r.text.slice(0, 2000))) return null;
  const { Readability } = await import("@mozilla/readability");
  const doc = new DOMParser().parseFromString(r.text, "text/html");
  const baseEl = doc.createElement("base");
  baseEl.href = r.finalUrl;
  doc.head.prepend(baseEl);
  const art = new Readability(doc, { charThreshold: 200 }).parse();
  if (!art?.content || (art.textContent?.trim().length ?? 0) < 150) return null;
  return { html: await sanitize(art.content, r.finalUrl), byline: art.byline ?? null };
}

function ReadingView() {
  const { postId } = Route.useParams();
  const { ready, posts, feeds, markRead, online } = useStore();
  const post = posts.find((p) => p.id === postId);
  const feed = feeds.find((f) => f.id === post?.feedId);
  const originalUrl = post ? webUrl(post.link, feed?.siteUrl || feed?.url || post.link) : "";
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  const idx = posts.findIndex((p) => p.id === postId);
  const prev = idx > 0 ? posts[idx - 1] : undefined;
  const next = idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : undefined;

  useEffect(() => {
    if (post && !post.read) void markRead(post.id);
  }, [post, markRead]);

  useEffect(() => {
    if (!post) return;
    let cancel = false;
    setLoading(true);
    setArticle(null);
    setSummary("");
    (async () => {
      const clean = await sanitize(post.summary, originalUrl || feed?.siteUrl || feed?.url || "");
      if (cancel) return;
      setSummary(clean);
      const d = await db();
      const cached = await d.get("articles", post.id);
      if (cached?.html) {
        if (!cancel) { setArticle(cached); setLoading(false); }
        return;
      }
      // The feed already ships the whole post: no need to scrape the site.
      if (textLength(clean) >= FULL_FEED_CHARS || !navigator.onLine || !originalUrl) {
        if (!cancel) { setArticle({ postId: post.id, html: null, fetchedAt: Date.now() }); setLoading(false); }
        return;
      }
      let a: Article;
      try {
        const res = await extract(originalUrl);
        a = { postId: post.id, html: res?.html ?? null, byline: res?.byline, fetchedAt: Date.now() };
      } catch {
        a = { postId: post.id, html: null, fetchedAt: Date.now() };
      }
      // Only cache successful extractions so a temporary failure is retried next time.
      if (a.html) await d.put("articles", a);
      if (!cancel) {
        setArticle(a);
        setLoading(false);
      }
    })().catch(() => {
      if (!cancel) { setArticle({ postId: post.id, html: null, fetchedAt: Date.now() }); setLoading(false); }
    });
    return () => {
      cancel = true;
    };
  }, [post?.id, post?.summary, originalUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const author = useMemo(() => article?.byline || post?.author, [article, post]);

  // Use whichever is fuller: the extracted page or the feed's own body.
  const body = useMemo(() => {
    const extracted = article?.html ?? "";
    if (extracted && textLength(extracted) >= textLength(summary) * 0.8) return { html: extracted, full: true };
    if (summary && textLength(summary) >= FULL_FEED_CHARS) return { html: summary, full: true };
    return { html: summary, full: false };
  }, [article, summary]);

  // Hide images the source site refuses to serve instead of showing broken icons.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const hide = (img: HTMLImageElement) => { img.style.display = "none"; };
    const imgs = Array.from(root.querySelectorAll("img"));
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth === 0) hide(img);
      img.addEventListener("error", () => hide(img), { once: true });
    });
  }, [body.html, loading]);

  if (!ready) return <ArticleSkeleton />;
  if (!post)
    return (
      <div className="brut-lg mx-auto max-w-xl bg-pink p-8 text-center">
        <h1 className="text-3xl sm:text-4xl">{online ? "POST NOT FOUND" : "NOT CACHED"}</h1>
        <p className="mt-3">{online ? "This post isn't in your timeline anymore." : "This content isn't available offline yet. Reconnect to load it."}</p>
        <Link to="/timeline" className={buttonVariants({ className: "mt-6" })}>
          ← Back to timeline
        </Link>
      </div>
    );

  const openOriginal = originalUrl ? (
    <a href={originalUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "pink" })}>
      Open original ↗
    </a>
  ) : null;

  return (
    <article className="mx-auto w-full min-w-0">
      <Link to="/timeline" className="mb-6 inline-block font-display text-sm uppercase underline">
        ← Timeline
      </Link>
      <header className="mb-8 border-b-[6px] border-ink pb-6">
        {feed && (
          <Link to="/feed/$id" params={{ id: feed.id }} className="brut mb-4 inline-block bg-sage-light px-2 py-1 font-display text-xs uppercase">
            {feed.title}
          </Link>
        )}
        <h1 className="break-words text-2xl normal-case leading-tight sm:text-3xl md:text-4xl lg:text-5xl">{post.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          {author && <span className="font-bold">{author}</span>}
          <span>{fmtDate(post.date)}</span>
          {article?.html && <Sticker tone="sage">CACHED – AVAILABLE OFFLINE</Sticker>}
          {openOriginal && <span className="sm:ml-auto">{openOriginal}</span>}
        </div>
      </header>

      {loading ? (
        <>
          <p role="status" className="mb-4 font-display text-xs uppercase">Loading full article…</p>
          {summary ? <div ref={bodyRef} className="article-body" dangerouslySetInnerHTML={{ __html: summary }} /> : <ArticleSkeleton />}
        </>
      ) : (
        <>
          {!body.full && (
            <div className="mb-8 flex flex-wrap items-center gap-3 border-l-[3px] border-ink bg-pink px-3 py-2 text-xs">
              <span className="flex-1">
                {online ? "This site only shares a preview and blocks full-article loading. Read the rest on the original site." : "Offline. Showing the saved feed summary."}
              </span>
              {online && openOriginal}
            </div>
          )}
          <div ref={bodyRef} className="article-body" dangerouslySetInnerHTML={{ __html: body.html || "<p>No summary in feed.</p>" }} />
          {!body.full && online && originalUrl && <div className="mt-8">{openOriginal}</div>}
        </>
      )}

      <nav className="mt-12 grid grid-cols-2 gap-4 border-t-[6px] border-ink pt-6">
        {prev ? (
          <Link to="/read/$postId" params={{ postId: prev.id }} className="brut brut-press bg-cream p-3">
            <span className="font-display text-xs">← NEWER</span>
            <span className="mt-1 block line-clamp-2 text-sm font-bold">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to="/read/$postId" params={{ postId: next.id }} className="brut brut-press bg-cream p-3 text-right">
            <span className="font-display text-xs">OLDER →</span>
            <span className="mt-1 block line-clamp-2 text-sm font-bold">{next.title}</span>
          </Link>
        )}
      </nav>
      <div className="mt-6 text-center">
        <Button variant="sage" size="sm" onClick={() => void markRead(post.id, false)}>
          Mark unread
        </Button>
      </div>
    </article>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-[68ch] space-y-4">
      <SkeletonBar className="h-6 w-full bg-sage-light" />
      <SkeletonBar className="h-6 w-11/12 bg-pink" />
      <SkeletonBar className="h-6 w-full bg-sage-light" />
      <SkeletonBar className="h-40 w-full bg-pink" />
      <SkeletonBar className="h-6 w-4/5 bg-sage-light" />
    </div>
  );
}
