import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Card, SectionHeader, Toggle } from "@/components/brut";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Settings & Privacy — READLY" },
      { name: "description", content: "Manage your offline cache, storage use and background refresh." },
      { property: "og:title", content: "Settings & Privacy — READLY" },
      { property: "og:description", content: "Manage your offline cache, storage use and background refresh." },
    ],
  }),
  component: Settings,
});

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

function Settings() {
  const { settings, updateSettings, clearArticles, clearEverything } = useStore();
  const { theme, setTheme } = useTheme();
  const [usage, setUsage] = useState<number | null>(null);

  const refreshUsage = () => navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? 0));
  useEffect(() => {
    void refreshUsage();
  }, []);

  return (
    <div className="space-y-10">
      <SectionHeader>Settings & Privacy</SectionHeader>

      <section>
        <SectionHeader tone="sage">Appearance</SectionHeader>
        <Card className="flex items-center gap-5 p-6">
          <Toggle checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} label="Dark mode" />
          <div>
            <p className="font-display uppercase">Dark mode</p>
            <p className="text-sm">Your palette, flipped: cream goes near-black, ink goes near-white. Saved on this device; until you choose, it follows your system.</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader tone="pink">Cache</SectionHeader>
        <Card className="space-y-4 p-6">
          <p>
            Storage used: <b>{usage === null ? "…" : fmtBytes(usage)}</b>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="sage"
              onClick={async () => {
                await clearArticles();
                void refreshUsage();
              }}
            >
              Clear cached articles
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm("Delete all feeds, posts, and settings from this browser?")) return;
                await clearEverything();
                void refreshUsage();
              }}
            >
              Clear everything
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader tone="sage">Refresh</SectionHeader>
        <Card className="flex items-center gap-5 p-6">
          <Toggle checked={settings.backgroundRefresh} onChange={(v) => void updateSettings({ backgroundRefresh: v })} label="Background refresh" />
          <div>
            <p className="font-display uppercase">Background refresh</p>
            <p className="text-sm">Check feeds when the app opens and every 30 minutes while it's open.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
