import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Input, Sticker } from "./brut";
import { AddFeedProvider } from "./AddFeedModal";
import { timeAgo, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useReaderAuth } from "@/lib/auth-context";
import { buttonVariants } from "./brut";

const NAV = [
  { to: "/timeline", label: "Timeline", icon: "▤" },
  { to: "/subscriptions", label: "Subscriptions", icon: "◫" },
  { to: "/discover", label: "Discover", icon: "✦" },
  { to: "/settings", label: "Settings", icon: "⚙" },
  { to: "/about", label: "About", icon: "?" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useReaderAuth();
  const { posts, online, refreshing, refreshAll, settings, ready, feeds } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? "" });
  const navigate = useNavigate();
  const [q, setQ] = useState(search);
  const unread = posts.filter((p) => !p.read).length;
  const [, tick] = useState(0);

  useEffect(() => setQ(search), [search]);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  // first-run onboarding
  useEffect(() => {
    if (ready && !settings.onboarded && feeds.length === 0 && pathname === "/timeline") navigate({ to: "/welcome" });
  }, [ready, settings.onboarded, feeds.length, pathname, navigate]);

  if (["/", "/auth", "/reset-password", "/welcome"].includes(pathname)) return <AddFeedProvider>{children}</AddFeedProvider>;

  const active = (to: string) => (to === "/timeline" ? pathname === "/timeline" || pathname.startsWith("/read") : pathname.startsWith(to));

  return (
    <AddFeedProvider>
      <div className="min-h-screen lg:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r-[3px] border-ink bg-sage-light p-5 lg:flex">
          <Link to="/" className="brut block -rotate-1 bg-pink px-3 py-3 text-center font-display text-2xl leading-none">
            READLY
          </Link>
          <nav className="flex flex-col gap-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={cn("brut-press flex items-center justify-between border-[3px] border-ink px-3 py-2 font-display text-sm uppercase", active(n.to) ? "on-sage shadow-brut" : "bg-cream")}>
                <span>
                  <span className="mr-2" aria-hidden>
                    {n.icon}
                  </span>
                  {n.label}
                </span>
                {n.to === "/timeline" && unread > 0 && <span className="border-2 border-ink bg-ink px-1.5 text-xs text-cream">{unread > 999 ? "999+" : unread}</span>}
              </Link>
            ))}
          </nav>
          <p className="mt-auto text-xs">Your feeds live in this browser. Accounts are optional.</p>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {!online && <div className="border-b-[3px] border-ink bg-pink px-4 py-2 text-center font-display text-sm uppercase">You're offline — showing cached posts and articles</div>}
          <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b-[3px] border-ink bg-cream px-4 py-3">
            <Link to="/" className="brut bg-pink px-2 py-1 font-display text-sm lg:hidden">
              READLY
            </Link>
            <form
              className="min-w-40 flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/timeline", search: q ? { q } : {} });
              }}
            >
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" aria-label="Search posts" className="h-10" />
            </form>
            <Sticker tone={online ? "sage" : "pink"}>{online ? "ONLINE" : "OFFLINE"}</Sticker>
            <span className="hidden text-xs lg:inline">synced {timeAgo(settings.lastSynced)}</span>
            <Button size="sm" variant="secondary" onClick={() => void refreshAll()} disabled={refreshing || !online}>
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </Button>
            <Link to="/auth" search={{ mode: "signin" }} className={buttonVariants({ size: "sm", variant: "pink" })}>{user ? "My account" : "Sign in"}</Link>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div key={pathname} className="page-enter">{children}</div></main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-[3px] border-ink bg-sage-light lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={cn("relative flex flex-col items-center gap-0.5 border-r-[3px] border-ink py-2 font-display text-[10px] uppercase last:border-r-0", active(n.to) && "on-sage")}>
              <span className="text-lg leading-none" aria-hidden>
                {n.icon}
              </span>
              {n.label.slice(0, 8)}
              {n.to === "/timeline" && unread > 0 && <span className="absolute right-2 top-1 border-2 border-ink bg-ink px-1 text-[9px] text-cream">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </AddFeedProvider>
  );
}
