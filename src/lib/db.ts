import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Health = "OK" | "SLOW" | "DEAD" | "MALFORMED" | "PENDING";

export interface Feed {
  id: string; // normalized feed url
  url: string;
  title: string;
  siteUrl: string;
  health: Health;
  lastFetched: number | null;
  lastError?: string | undefined;
  tags: string[];
  addedAt: number;
}

export interface Post {
  id: string;
  feedId: string;
  title: string;
  link: string;
  author?: string | undefined;
  date: number;
  summary: string; // html (sanitized on render)
  read: boolean;
}

export interface Article {
  postId: string;
  html: string | null; // sanitized html; null = failed
  byline?: string | null | undefined;
  fetchedAt: number;
}

export interface Settings {
  sharing: boolean;
  backgroundRefresh: boolean;
  onboarded: boolean;
  lastSynced: number | null;
  lastShared: number | null;
}

export const DEFAULT_SETTINGS: Settings = { sharing: false, backgroundRefresh: true, onboarded: false, lastSynced: null, lastShared: null };

interface ReaderDB extends DBSchema {
  feeds: { key: string; value: Feed };
  posts: { key: string; value: Post; indexes: { byFeed: string } };
  articles: { key: string; value: Article };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<ReaderDB>> | null = null;
export function db() {
  if (!dbp) {
    dbp = openDB<ReaderDB>("small-web-reader", 1, {
      upgrade(d) {
        d.createObjectStore("feeds", { keyPath: "id" });
        const p = d.createObjectStore("posts", { keyPath: "id" });
        p.createIndex("byFeed", "feedId");
        d.createObjectStore("articles", { keyPath: "postId" });
        d.createObjectStore("kv");
      },
    });
  }
  return dbp;
}

export async function loadSettings(): Promise<Settings> {
  const s = (await (await db()).get("kv", "settings")) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}
export async function saveSettings(s: Settings) {
  await (await db()).put("kv", s, "settings");
}
