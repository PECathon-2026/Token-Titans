// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        filename: "sw.js",
        outDir: "dist/client",
        workbox: {
          // Precache every built script/style so all screens work offline.
          globPatterns: ["**/*.{js,css,woff2,svg,png,jpg,ico}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "readly-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60 },
                plugins: [
                  {
                    // Offline on a page never opened before: fall back to a saved reader page;
                    // the app then renders the requested screen from on-device data.
                    handlerDidError: async () =>
                      (await caches.match("/timeline", { cacheName: "readly-pages" })) ??
                      (await caches.match("/", { cacheName: "readly-pages" })) ??
                      Response.error(),
                  },
                ],
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "readly-fonts", expiration: { maxEntries: 30 } },
            },
          ],
        },
      }),
    ],
  },
});
