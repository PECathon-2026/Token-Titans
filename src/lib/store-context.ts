import { createContext, useContext } from "react";
import type { Feed, Post, Settings } from "./db";
import type { ParsedFeed } from "./feeds";

export interface Store {
  ready: boolean;
  online: boolean;
  refreshing: boolean;
  feeds: Feed[];
  posts: Post[];
  settings: Settings;
  subscribe: (url: string, opts?: { title?: string; parsed?: ParsedFeed; tags?: string[]; quiet?: boolean }) => Promise<"added" | "duplicate" | "invalid">;
  isSubscribed: (url: string) => boolean;
  unsubscribe: (id: string) => Promise<void>;
  refreshFeed: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  markRead: (postId: string, read?: boolean) => Promise<void>;
  markAllRead: (feedId?: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setTags: (feedId: string, tags: string[]) => Promise<void>;
  clearArticles: () => Promise<void>;
  clearEverything: () => Promise<void>;
}

// Keep identity independent of provider implementation refreshes.
export const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}