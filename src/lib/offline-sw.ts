/** The only place the offline service worker is registered. Never runs in dev or previews. */
const PREVIEW_HOST = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const WARM_PAGES = ["/timeline", "/subscriptions", "/discover", "/settings", "/about", "/"];

export function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname.toLowerCase();
  const label = h.split(".")[0] ?? "";
  for (const d of ["lovable.app", "gpt-eng.com", "gptengineer.run"]) {
    if (h.endsWith(`.${d}`) && (PREVIEW_HOST.test(label) || /^project--.+-dev$/.test(label))) return true;
  }
  for (const d of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
    if (h === d || h.endsWith(`.${d}`)) return true;
  }
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

async function unregisterAppSw() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}

export async function setupOfflineCache() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) { await unregisterAppSw().catch(() => {}); return; }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    // Save the main screens once so they open without internet later.
    const cache = await caches.open("readly-pages");
    for (const p of WARM_PAGES) {
      void fetch(p, { headers: { accept: "text/html" } }).then((r) => (r.ok ? cache.put(p, r) : undefined)).catch(() => {});
    }
  } catch { /* offline caching is best-effort */ }
}
