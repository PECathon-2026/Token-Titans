import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card, SectionHeader } from "@/components/brut";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "About — READLY" },
      { name: "description", content: "How READLY works, its architecture and threat model." },
      { property: "og:title", content: "About — READLY" },
      { property: "og:description", content: "How READLY works, its architecture and threat model." },
    ],
  }),
  component: About,
});

function Box({ children, tone }: { children: ReactNode; tone: string }) {
  return <div className={`brut px-4 py-3 text-center font-display text-sm uppercase ${tone}`}>{children}</div>;
}
const Arrow = () => (
  <div className="flex items-center justify-center font-display text-2xl" aria-hidden>
    <span className="md:hidden">↓</span>
    <span className="hidden md:inline">→</span>
  </div>
);

function About() {
  return (
    <div className="space-y-12">
      <SectionHeader>About</SectionHeader>
      <section className="grid gap-5 md:grid-cols-3">
        {[
          ["Subscribe", "Paste any blog address. We find its RSS or Atom feed automatically."],
          ["Read anywhere", "Posts and full articles are cached in your browser, so they open offline."],
          ["Discover", "Optionally share feed URLs anonymously; suggestions come from blogs that are often submitted together."],
        ].map(([t, d]) => (
          <Card key={t} className="p-5">
            <h3 className="mb-2 text-xl">{t}</h3>
            <p className="text-sm">{d}</p>
          </Card>
        ))}
      </section>

      <section>
        <SectionHeader tone="pink">Architecture</SectionHeader>
        <Card large className="space-y-6 p-6">
          <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Box tone="bg-cream">Client (your browser)</Box>
            <Arrow />
            <Box tone="on-sage">Fetch route</Box>
            <Arrow />
            <Box tone="bg-sage-light">The web</Box>
          </div>
          <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Box tone="bg-cream">Client (your browser)</Box>
            <Arrow />
            <Box tone="bg-pink">Discovery API</Box>
            <Arrow />
            <Box tone="bg-sage-light">Database</Box>
          </div>
          <p className="text-sm">Parsing, article extraction and sanitizing all happen in your browser. The fetch route only relays raw bytes with a 10s timeout and 5 MB cap, and refuses private network addresses.</p>
        </Card>
      </section>

      <section>
        <SectionHeader tone="sage">Threat model</SectionHeader>
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="bg-sage-light p-5 text-sm">
            <p className="mb-2 font-display uppercase">Protected</p>
            <ul className="list-[square] space-y-1 pl-4">
              <li>Reading history never leaves your device</li>
              <li>Accounts are optional; only your account and profile are stored when you sign up</li>
              <li>Shared batches can't be linked to each other or to you</li>
              <li>Article HTML is sanitized before rendering</li>
            </ul>
          </Card>
          <Card className="bg-pink p-5 text-sm">
            <p className="mb-2 font-display uppercase">Limits</p>
            <ul className="list-[square] space-y-1 pl-4">
              <li>The fetch route sees which URLs are requested (not stored)</li>
              <li>Blogs see the fetch route's address, not yours</li>
              <li>Clearing browser data deletes your subscriptions — export OPML</li>
              <li>Counts only rise from real submissions; rate limits slow anyone trying to inflate them</li>
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}
