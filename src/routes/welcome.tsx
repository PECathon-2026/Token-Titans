import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Checkbox } from "@/components/brut";
import { SEED_BLOGS } from "@/lib/seeds";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Welcome — READLY" },
      { name: "description", content: "Follow the web, not the algorithm. Pick a few independent blogs to start." },
      { property: "og:title", content: "Follow the web, not the algorithm — READLY" },
      { property: "og:description", content: "Pick a few independent blogs to start reading, privately." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { subscribe, updateSettings } = useStore();
  const navigate = useNavigate();
  const [sel, setSel] = useState<Set<string>>(() => new Set(SEED_BLOGS.slice(0, 4).map((b) => b.url)));
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    for (const b of SEED_BLOGS) if (sel.has(b.url)) await subscribe(b.url, { title: b.title, tags: [b.tag], quiet: true });
    await updateSettings({ onboarded: true });
    if (sel.size) toast.success(`Subscribed to ${sel.size} blogs`);
    navigate({ to: "/timeline" });
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="brut mb-8 inline-block -rotate-1 bg-pink px-3 py-2 font-display">READLY</div>
        <h1 className="text-4xl leading-[0.95] md:text-7xl">
          Follow the web,
          <br />
          <span className="on-sage px-2">not the algorithm</span>
        </h1>
        <p className="mt-6 max-w-xl text-base">Pick some independent blogs to start. Everything stays in this browser — no account needed.</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEED_BLOGS.map((b) => {
            const on = sel.has(b.url);
            return (
              <Card key={b.url} interactive className={cn("cursor-pointer p-4", on ? "bg-sage-light" : "bg-cream")} onClick={() => setSel((s) => { const n = new Set(s); if (n.has(b.url)) n.delete(b.url); else n.add(b.url); return n; })}>
                <div className="pointer-events-none">
                  <Checkbox checked={on} onChange={() => {}} label={b.title} />
                  {b.blurb && <p className="mt-2 text-xs">{b.blurb}</p>}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={() => void finish()} disabled={busy}>
            {busy ? "Subscribing…" : `Subscribe to selected (${sel.size})`}
          </Button>
          <button
            className="font-display text-sm uppercase underline"
            onClick={async () => {
              await updateSettings({ onboarded: true });
              navigate({ to: "/timeline" });
            }}
          >
            Skip
          </button>
        </div>

        <Card large className="mt-14 bg-pink p-6">
          <h2 className="mb-5 text-2xl">How privacy works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              ["1", "Your feeds stay local", "Subscriptions, posts and read state live in your browser's storage."],
              ["2", "We only relay bytes", "A tiny fetch service grabs feeds for you. It never parses or keeps them."],
              ["3", "Sharing is opt-in", "If you turn it on, only feed URLs go out — one anonymous batch, no ID."],
            ].map(([n, t, d]) => (
              <li key={n} className="border-[3px] border-ink bg-cream p-4">
                <span className="brut mb-3 inline-flex h-10 w-10 items-center justify-center on-sage font-display text-xl">{n}</span>
                <p className="font-display uppercase">{t}</p>
                <p className="mt-1 text-sm">{d}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
