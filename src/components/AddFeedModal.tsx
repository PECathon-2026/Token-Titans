import { createContext, useContext, useState, type ReactNode } from "react";
import { Button, Callout, Input, Modal, ProgressBlocks } from "./brut";
import { discoverFeeds, FetchError, type DiscoveredFeed } from "@/lib/feeds";
import { useStore } from "@/lib/store";
import { normalizeUrl } from "@/lib/url";

type Phase =
  | { k: "idle" }
  | { k: "working"; step: string }
  | { k: "pick"; feeds: DiscoveredFeed[] }
  | { k: "none" }
  | { k: "invalid" }
  | { k: "duplicate"; url: string }
  | { k: "dead"; slow: boolean; message: string };

const Ctx = createContext<(url?: string) => void>(() => {});
export const useAddFeed = () => useContext(Ctx);

export function AddFeedProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState("");
  return (
    <Ctx.Provider
      value={(u) => {
        setInitial(u ?? "");
        setOpen(true);
      }}
    >
      {children}
      {open && <AddFeedModal initial={initial} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

function AddFeedModal({ initial, onClose }: { initial: string; onClose: () => void }) {
  const { subscribe, isSubscribed } = useStore();
  const [url, setUrl] = useState(initial);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });

  const run = async (raw = url) => {
    const n = normalizeUrl(raw);
    if (!n) return setPhase({ k: "invalid" });
    if (isSubscribed(n)) return setPhase({ k: "duplicate", url: n });
    setPhase({ k: "working", step: "Starting…" });
    try {
      const found = await discoverFeeds(n, (step) => setPhase({ k: "working", step }));
      if (!found.length) return setPhase({ k: "none" });
      if (found.length === 1) return add(found[0]!);
      setPhase({ k: "pick", feeds: found });
    } catch (e) {
      if (e instanceof FetchError && e.kind === "INVALID") return setPhase({ k: "invalid" });
      if (e instanceof Error && e.message === "MALFORMED") return setPhase({ k: "dead", slow: false, message: "The feed exists but its XML is broken." });
      setPhase({ k: "dead", slow: e instanceof FetchError && e.kind === "SLOW", message: (e as Error).message });
    }
  };

  const add = async (f: DiscoveredFeed) => {
    const r = await subscribe(f.url, { parsed: f.parsed, title: f.parsed.title });
    if (r === "duplicate") return setPhase({ k: "duplicate", url: f.url });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Add a feed">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="flex gap-2"
      >
        <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="jvns.ca or https://site.com/feed.xml" aria-label="Site or feed URL" />
        <Button type="submit" disabled={phase.k === "working"}>
          Find
        </Button>
      </form>
      <div className="mt-5 space-y-3">
        {phase.k === "working" && (
          <>
            <ProgressBlocks />
            <p className="font-display text-xs uppercase">{phase.step}</p>
          </>
        )}
        {phase.k === "pick" && (
          <>
            <p className="font-display uppercase">Found {phase.feeds.length} feeds — pick one:</p>
            {phase.feeds.map((f) => (
              <button key={f.url} onClick={() => void add(f)} className="brut brut-press block w-full bg-sage-light p-3 text-left">
                <span className="block font-display uppercase">{f.title}</span>
                <span className="block truncate text-xs">{f.url}</span>
                <span className="block text-xs">{f.parsed.items.length} posts</span>
              </button>
            ))}
          </>
        )}
        {phase.k === "none" && <Callout title="No feed found">We checked the page and the usual spots (/feed, /rss.xml, /atom.xml). Try pasting the feed URL directly.</Callout>}
        {phase.k === "invalid" && <Callout tone="danger" title="Invalid URL">That doesn't look like a web address. Try something like example.com.</Callout>}
        {phase.k === "duplicate" && <Callout tone="sage" title="Already subscribed">You already follow this feed ({phase.url}).</Callout>}
        {phase.k === "dead" && (
          <Callout tone={phase.slow ? "pink" : "danger"} title={phase.slow ? "Site is too slow" : "Dead site"}>
            {phase.slow ? "It didn't answer within 10 seconds." : phase.message} <button className="ml-1 underline" onClick={() => void run()}>Retry</button>
          </Callout>
        )}
      </div>
    </Modal>
  );
}
