import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { buttonVariants } from "@/components/brut";
import { AuthContext, type ReaderAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { currentTheme, syncTheme } from "@/lib/theme";
import { setupOfflineCache } from "@/lib/offline-sw";

/* Paints the saved theme before first paint (no flash of the light palette) and tells
   the app which one it chose, so React hydrates the same class the DOM already carries. */
const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("swr-theme");var d=(t==="dark"||(!t&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches))?"dark":"light";window.__SWR_THEME=d;if(d==="dark")document.documentElement.classList.add("dark")}catch(e){window.__SWR_THEME="light"}`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="brut-lg -rotate-2 bg-pink px-10 py-6">
        <h1 className="text-[120px] leading-none md:text-[180px]">404</h1>
      </div>
      <p className="font-display text-xl uppercase">This page wandered off the small web.</p>
      <Link to="/timeline" className={buttonVariants({ size: "lg" })}>
        ← Back to timeline
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="brut-lg max-w-md bg-pink p-8 text-center">
        <h1 className="text-3xl">This page didn't load</h1>
        <p className="mt-3">Something went wrong. Try again or head back.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={buttonVariants()}
          >
            Try again
          </button>
          <a href="/" className={buttonVariants({ variant: "secondary" })}>
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "READLY" },
      { name: "description", content: "A private, offline-first RSS & Atom reader for the small web." },
      { property: "og:title", content: "READLY" },
      { property: "og:description", content: "A private, offline-first RSS & Atom reader for the small web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:wght@400;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,700;1,8..60,400&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={currentTheme() === "dark" ? "dark" : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [auth, setAuth] = useState<ReaderAuth>({ user: null, loading: true, recovery: false });
  useEffect(() => { syncTheme(); void setupOfflineCache(); }, []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        revision++;
        setAuth({ user: session?.user ?? null, loading: false, recovery: true });
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      revision++;
      setAuth((a) => ({ user: session?.user ?? null, loading: false, recovery: event === "SIGNED_OUT" || event === "USER_UPDATED" ? false : a.recovery }));
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    const before = revision;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && revision === before) setAuth((a) => ({ ...a, user: data.user, loading: false }));
    }).catch(() => { if (active && revision === before) setAuth({ user: null, loading: false, recovery: false }); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
      <StoreProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "brut flex w-[340px] items-center gap-3 bg-cream px-4 py-3 font-display text-sm uppercase",
              success: "bg-sage-dark text-primary-foreground",
              error: "bg-danger text-cream",
            },
          }}
        />
      </StoreProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
