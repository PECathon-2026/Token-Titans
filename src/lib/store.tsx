import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { db, loadSettings, saveSettings, DEFAULT_SETTINGS, type Feed, type Post, type Settings, type Health } from "./db";
import { FetchError, hashId, parseFeed, proxyFetch, type ParsedFeed } from "./feeds";
import { feedKey, normalizeUrl } from "./url";

import { StoreContext, type Store } from "./store-context";
export { useStore } from "./store-context";

function itemsToPosts(feedId: string, parsed: ParsedFeed, existing: Map<string, Post>): Post[] {
  return parsed.items.slice(0, 50).map((it) => {
    const id = hashId(feedId + "|" + (it.guid || it.link || it.title));
    const prev = existing.get(id);
    return { id, feedId, title: it.title, link: it.link, author: it.author, date: it.date || prev?.date || Date.now(), summary: it.summary, read: prev?.read ?? false };
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const feedsRef = useRef<Feed[]>([]);
  feedsRef.current = feeds;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const reload = useCallback(async () => {
    const d = await db();
    const [f, p] = await Promise.all([d.getAll("feeds"), d.getAll("posts")]);
    setFeeds(f.sort((a, b) => a.title.localeCompare(b.title)));
    setPosts(p.sort((a, b) => b.date - a.date));
  }, []);

  const writeFeedPosts = useCallback(async (feed: Feed, parsed: ParsedFeed) => {
    const d = await db();
    const existing = new Map((await d.getAllFromIndex("posts", "byFeed", feed.id)).map((p) => [p.id, p]));
    const tx = d.transaction("posts", "readwrite");
    for (const p of itemsToPosts(feed.id, parsed, existing)) await tx.store.put(p);
    await tx.done;
  }, []);

  const fetchFeed = useCallback(
    async (feed: Feed): Promise<Feed> => {
      try {
        const r = await proxyFetch(feed.url);
        let parsed: ParsedFeed;
        try {
          parsed = parseFeed(r.text, r.finalUrl);
        } catch {
          return { ...feed, health: "MALFORMED", lastFetched: Date.now(), lastError: "Feed XML could not be parsed" };
        }
        await writeFeedPosts(feed, parsed);
        const health: Health = r.ms > 5000 ? "SLOW" : "OK";
        return { ...feed, title: feed.title || parsed.title, siteUrl: feed.siteUrl || parsed.siteUrl, health, lastFetched: Date.now(), lastError: undefined };
      } catch (e) {
        const kind = e instanceof FetchError ? e.kind : "DEAD";
        return { ...feed, health: kind === "SLOW" ? "SLOW" : "DEAD", lastFetched: Date.now(), lastError: (e as Error).message };
      }
    },
    [writeFeedPosts],
  );

  const refreshFeed = useCallback(
    async (id: string) => {
      const f = feedsRef.current.find((x) => x.id === id);
      if (!f) return;
      const updated = await fetchFeed(f);
      await (await db()).put("feeds", updated);
      await reload();
      if (updated.health === "DEAD" || updated.health === "MALFORMED") toast.error(`Fetch failed: ${updated.title}`);
    },
    [fetchFeed, reload],
  );

  const refreshAll = useCallback(async () => {
    if (!navigator.onLine || !feedsRef.current.length) return;
    setRefreshing(true);
    try {
      const d = await db();
      const queue = [...feedsRef.current];
      let failed = 0;
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          for (let f = queue.shift(); f; f = queue.shift()) {
            const u = await fetchFeed(f);
            if (u.health === "DEAD" || u.health === "MALFORMED") failed++;
            await d.put("feeds", u);
          }
        }),
      );
      const s = { ...settingsRef.current, lastSynced: Date.now() };
      setSettings(s);
      await saveSettings(s);
      await reload();
      if (failed) toast.error(`Fetch failed for ${failed} feed${failed > 1 ? "s" : ""}`);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeed, reload]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      setSettings(await loadSettings());
      await reload();
      setReady(true);
    })();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [reload]);

  // background refresh after cache loads, then every 30 minutes
  useEffect(() => {
    if (!ready || !settings.backgroundRefresh) return;
    const stale = !settings.lastSynced || Date.now() - settings.lastSynced > 10 * 60_000;
    if (stale) void refreshAll();
    const t = setInterval(() => void refreshAll(), 30 * 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.backgroundRefresh]);

  const isSubscribed = useCallback((url: string) => feedsRef.current.some((f) => feedKey(f.url) === feedKey(url)), []);

  const subscribe: Store["subscribe"] = useCallback(
    async (url, opts = {}) => {
      const n = normalizeUrl(url);
      if (!n) return "invalid";
      if (feedsRef.current.some((f) => feedKey(f.url) === feedKey(n))) return "duplicate";
      const feed: Feed = { id: n, url: n, title: opts.title ?? opts.parsed?.title ?? "", siteUrl: opts.parsed?.siteUrl ?? "", health: "PENDING", lastFetched: null, tags: opts.tags ?? [], addedAt: Date.now() };
      const d = await db();
      if (opts.parsed) {
        feed.health = "OK";
        feed.lastFetched = Date.now();
        await writeFeedPosts(feed, opts.parsed);
      }
      if (!feed.title) feed.title = new URL(n).hostname;
      await d.put("feeds", feed);
      feedsRef.current = [...feedsRef.current, feed];
      await reload();
      if (!opts.quiet) toast.success(`Feed added: ${feed.title}`);
      if (!opts.parsed) {
        void fetchFeed(feed).then(async (u) => {
          await d.put("feeds", u);
          await reload();
        });
      }
      return "added";
    },
    [fetchFeed, reload, writeFeedPosts],
  );

  const unsubscribe = useCallback(
    async (id: string) => {
      const d = await db();
      const ps = await d.getAllFromIndex("posts", "byFeed", id);
      const tx = d.transaction(["posts", "articles", "feeds"], "readwrite");
      for (const p of ps) {
        await tx.objectStore("posts").delete(p.id);
        await tx.objectStore("articles").delete(p.id);
      }
      await tx.objectStore("feeds").delete(id);
      await tx.done;
      await reload();
      toast("Unsubscribed");
    },
    [reload],
  );

  const markRead = useCallback(async (postId: string, read = true) => {
    const d = await db();
    const p = await d.get("posts", postId);
    if (!p || p.read === read) return;
    await d.put("posts", { ...p, read });
    setPosts((all) => all.map((x) => (x.id === postId ? { ...x, read } : x)));
  }, []);

  const markAllRead = useCallback(
    async (feedId?: string) => {
      const d = await db();
      const tx = d.transaction("posts", "readwrite");
      for (const p of await tx.store.getAll()) if (!p.read && (!feedId || p.feedId === feedId)) await tx.store.put({ ...p, read: true });
      await tx.done;
      await reload();
    },
    [reload],
  );

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const s = { ...settingsRef.current, ...patch };
    settingsRef.current = s;
    setSettings(s);
    await saveSettings(s);
  }, []);

  const setTags = useCallback(
    async (feedId: string, tags: string[]) => {
      const d = await db();
      const f = await d.get("feeds", feedId);
      if (f) await d.put("feeds", { ...f, tags });
      await reload();
    },
    [reload],
  );

  const clearArticles = useCallback(async () => {
    await (await db()).clear("articles");
    toast("Cached articles cleared");
  }, []);

  const clearEverything = useCallback(async () => {
    const d = await db();
    await Promise.all([d.clear("feeds"), d.clear("posts"), d.clear("articles"), d.clear("kv")]);
    setSettings(DEFAULT_SETTINGS);
    await reload();
    toast("Everything cleared");
  }, [reload]);

  const value = useMemo<Store>(
    () => ({ ready, online, refreshing, feeds, posts, settings, subscribe, isSubscribed, unsubscribe, refreshFeed, refreshAll, markRead, markAllRead, updateSettings, setTags, clearArticles, clearEverything }),
    [ready, online, refreshing, feeds, posts, settings, subscribe, isSubscribed, unsubscribe, refreshFeed, refreshAll, markRead, markAllRead, updateSettings, setTags, clearArticles, clearEverything],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function timeAgo(ts: number | null) {
  if (!ts) return "never";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
