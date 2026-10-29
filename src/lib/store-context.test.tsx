import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "./db";
import { StoreProvider, useStore } from "./store";
import { useStore as useStableStore } from "./store-context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    db: async () => ({ getAll: async () => [] }),
    loadSettings: async () => ({ ...actual.DEFAULT_SETTINGS, backgroundRefresh: false }),
  };
});

afterEach(cleanup);

describe("store context", () => {
  it("shares a stable hook between provider implementation and page consumers", async () => {
    expect(useStore).toBe(useStableStore);
    function Consumer() {
      const store = useStableStore();
      return <p>{store.ready ? `Feeds: ${store.feeds.length}; sharing: ${store.settings.sharing}` : "Loading"}</p>;
    }
    render(<StoreProvider><Consumer /></StoreProvider>);
    expect(await screen.findByText(`Feeds: 0; sharing: ${DEFAULT_SETTINGS.sharing}`)).toBeDefined();
  });
});